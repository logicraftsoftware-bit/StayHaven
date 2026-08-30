import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { SitesService } from '../sites/sites.service';
import {
  DEFAULT_HOME_SECTIONS,
  PAGE_PRESETS,
  PAGE_SLUGS,
  SECTION_FIELDS,
  SECTION_TYPES,
  type PageSlug,
  type SectionType,
} from './page-config.constants';
import { UpdatePageConfigDto } from './dto/page-config.dto';
import { PageConfig } from './schemas/page-config.schema';

type Section = {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
};
type Content = { seo: Record<string, unknown>; sections: Section[] };
@Injectable()
export class PageConfigsService {
  private readonly cache = new Map<
    string,
    { expires: number; value: unknown }
  >();
  constructor(
    @InjectModel(PageConfig.name) private model: Model<PageConfig>,
    private sites: SitesService,
    private audit: AuditLogsService,
  ) {}

  private assertPage(page: string): asserts page is PageSlug {
    if (!PAGE_SLUGS.includes(page as PageSlug))
      throw new BadRequestException('Unsupported page slug');
  }
  private safeConfig(type: SectionType, config: Record<string, unknown> = {}) {
    const allowed = SECTION_FIELDS[type];
    const output: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = config[key];
      if (value === undefined) continue;
      if (typeof value === 'string' && value.length > 500)
        throw new BadRequestException(`${type}.${key} is too long`);
      if (
        key === 'limit' &&
        (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 24)
      )
        throw new BadRequestException(`${type}.limit must be between 1 and 24`);
      output[key] = value;
    }
    return output;
  }
  private normalize(dto: UpdatePageConfigDto): Content {
    const ids = new Set<string>();
    const sections = dto.sections
      .map((section, index) => {
        if (!SECTION_TYPES.includes(section.type as SectionType))
          throw new BadRequestException('Unsupported section type');
        if (ids.has(section.id))
          throw new BadRequestException('Section ids must be unique');
        ids.add(section.id);
        return {
          id: section.id,
          type: section.type as SectionType,
          enabled: Boolean(section.enabled),
          order: section.order ?? index,
          config: this.safeConfig(section.type as SectionType, section.config),
        };
      })
      .sort((a, b) => a.order - b.order)
      .map((section, order) => ({ ...section, order }));
    return {
      seo: {
        title: dto.seo?.title || '',
        description: dto.seo?.description || '',
        canonical: dto.seo?.canonical || '',
        noindex: Boolean(dto.seo?.noindex),
      },
      sections,
    };
  }
  private defaults(page: PageSlug, preset = 'DEFAULT_HOME'): Content {
    const source =
      page === 'home'
        ? PAGE_PRESETS[preset as keyof typeof PAGE_PRESETS] ||
          DEFAULT_HOME_SECTIONS
        : [];
    return {
      seo: {},
      sections: source.map(([type, config], order) => ({
        id: `${type}-${order + 1}`,
        type,
        enabled: true,
        order,
        config: { ...config },
      })),
    };
  }
  async getAdmin(siteId: string, page: string) {
    this.assertPage(page);
    const site = await this.sites.get(siteId);
    const existing = await this.model
      .findOne({ siteId: new Types.ObjectId(siteId), pageSlug: page })
      .lean();
    if (existing) return existing;
    const content = this.defaults(page);
    return {
      siteId,
      siteName: site.name,
      pageSlug: page,
      enabled: true,
      preset: 'DEFAULT_HOME',
      draft: content,
      published: content,
    };
  }
  async updateDraft(
    siteId: string,
    page: string,
    dto: UpdatePageConfigDto,
    actor: string,
  ) {
    this.assertPage(page);
    await this.sites.get(siteId);
    const draft = this.normalize(dto);
    const record = await this.model.findOneAndUpdate(
      { siteId: new Types.ObjectId(siteId), pageSlug: page },
      {
        $set: {
          enabled: dto.enabled ?? true,
          preset: dto.preset || 'DEFAULT_HOME',
          draft,
        },
        $setOnInsert: { published: this.defaults(page) },
      },
      { upsert: true, new: true, runValidators: true },
    );
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'PAGE_CONFIGURATION_CHANGED',
      entityType: 'PAGE_CONFIG',
      entityId: record._id,
      metadata: { siteId, page, sectionCount: draft.sections.length },
    });
    return record;
  }
  async publish(siteId: string, page: string, actor: string) {
    this.assertPage(page);
    const record = await this.model.findOne({
      siteId: new Types.ObjectId(siteId),
      pageSlug: page,
    });
    if (!record) throw new NotFoundException('Page configuration not found');
    record.published = record.draft;
    record.publishedAt = new Date();
    record.publishedBy = new Types.ObjectId(actor);
    await record.save();
    this.cache.delete(`${siteId}:${page}`);
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'PAGE_CONFIGURATION_PUBLISHED',
      entityType: 'PAGE_CONFIG',
      entityId: record._id,
      metadata: { siteId, page },
    });
    return record;
  }
  async getPublishedBySite(siteId: string, page: string) {
    this.assertPage(page);
    const key = `${siteId}:${page}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    const record = await this.model
      .findOne({
        siteId: new Types.ObjectId(siteId),
        pageSlug: page,
        enabled: true,
      })
      .select('siteId pageSlug enabled preset published publishedAt')
      .lean();
    const value = record || {
      siteId,
      pageSlug: page,
      enabled: true,
      preset: 'DEFAULT_HOME',
      published: this.defaults(page),
    };
    this.cache.set(key, { expires: Date.now() + 300_000, value });
    return value;
  }
  async getPublishedByHostname(hostname: string, page: string) {
    const site = (await this.sites.resolveActiveByDomain(hostname)) as {
      _id: Types.ObjectId;
    };
    return this.getPublishedBySite(String(site._id), page);
  }
}
