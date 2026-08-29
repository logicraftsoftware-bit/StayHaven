import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { CreateSiteDto, SiteStatusDto, UpdateSiteDto } from './dto/site.dto';
import { Site } from './schemas/site.schema';
import { SiteStatus } from '../common/enums/status.enum';
import { normalizeDomain, normalizeDomains } from './utils/normalize-domain';
@Injectable()
export class SitesService {
  constructor(
    @InjectModel(Site.name) private model: Model<Site>,
    private audit: AuditLogsService,
  ) {}
  private normalizePayload<T extends Partial<CreateSiteDto>>(dto: T): T {
    if (!dto.domain && !dto.domains) return dto;
    const domains = normalizeDomains(dto.domain || '', dto.domains || []);
    return { ...dto, domain: domains[0], domains };
  }

  private async assertAvailable(
    slug: string | undefined,
    domains: string[],
    excludeId?: string,
  ): Promise<void> {
    const conditions: Record<string, unknown>[] = [];
    if (slug) conditions.push({ slug: slug.toLowerCase() });
    if (domains.length) {
      conditions.push(
        { domain: { $in: domains } },
        { domains: { $in: domains } },
      );
    }
    if (!conditions.length) return;
    const query: Record<string, unknown> = { $or: conditions };
    if (excludeId) query._id = { $ne: new Types.ObjectId(excludeId) };
    if (await this.model.exists(query)) {
      throw new ConflictException('Site slug or domain already exists');
    }
  }

  async create(dto: CreateSiteDto, actor: string) {
    try {
      const payload = this.normalizePayload(dto);
      await this.assertAvailable(payload.slug, payload.domains || []);
      const site = await this.model.create(payload);
      await this.audit.record({
        actorId: new Types.ObjectId(actor),
        actorRole: Role.SUPER_ADMIN,
        action: 'SITE_CREATED',
        entityType: 'SITE',
        entityId: site._id,
      });
      return site;
    } catch (e) {
      if ((e as { code?: number }).code === 11000)
        throw new ConflictException('Site slug or domain already exists');
      throw e;
    }
  }
  list() {
    return this.model.find().sort({ createdAt: -1 });
  }
  async get(id: string) {
    const site = await this.model.findById(id);
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }
  async update(id: string, dto: UpdateSiteDto, actor: string) {
    const current = await this.get(id);
    const payload = this.normalizePayload({
      ...dto,
      domain: dto.domain || current.domain,
      domains: dto.domains || current.domains,
    });
    await this.assertAvailable(dto.slug, payload.domains || [], id);
    const site = await this.model.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!site) throw new NotFoundException('Site not found');
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'SITE_UPDATED',
      entityType: 'SITE',
      entityId: site._id,
    });
    return site;
  }
  async status(id: string, dto: SiteStatusDto, actor: string) {
    const site = await this.model.findByIdAndUpdate(
      id,
      { status: dto.status },
      { new: true },
    );
    if (!site) throw new NotFoundException('Site not found');
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'SITE_STATUS_CHANGED',
      entityType: 'SITE',
      entityId: site._id,
      metadata: { status: dto.status },
    });
    return site;
  }
  count() {
    return this.model.countDocuments();
  }

  listActive() {
    return this.model
      .find({ status: SiteStatus.ACTIVE })
      .select(
        'name slug domain domains city state country logo favicon tagline description heroTitle heroSubtitle ogImage theme seo contact social status',
      )
      .sort({ name: 1 })
      .lean();
  }

  async resolveActiveByDomain(domain: string) {
    const normalized = normalizeDomain(domain);
    const site = await this.model
      .findOne({
        status: SiteStatus.ACTIVE,
        $or: [{ domain: normalized }, { domains: normalized }],
      })
      .select(
        'name slug domain domains city state country logo favicon tagline description heroTitle heroSubtitle ogImage theme seo contact social status',
      )
      .lean();
    if (!site) throw new NotFoundException('Active site not found for domain');
    return site;
  }
}
