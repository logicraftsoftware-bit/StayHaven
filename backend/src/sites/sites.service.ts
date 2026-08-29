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
import { CreateSiteDomainDto, UpdateSiteDomainDto } from './dto/site.dto';
import {
  DomainSslStatus,
  DomainVerificationStatus,
  SiteDomain,
} from './schemas/site-domain.schema';
@Injectable()
export class SitesService {
  constructor(
    @InjectModel(Site.name) private model: Model<Site>,
    @InjectModel(SiteDomain.name) private domainModel: Model<SiteDomain>,
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
    if (
      domains.length &&
      (await this.domainModel.exists({
        normalizedDomain: { $in: domains },
        ...(excludeId
          ? { siteId: { $ne: new Types.ObjectId(excludeId) } }
          : {}),
      }))
    ) {
      throw new ConflictException(
        'Site domain already belongs to another site',
      );
    }
  }

  private async syncDomains(siteId: Types.ObjectId, domains: string[]) {
    const normalized = normalizeDomains(domains[0] || '', domains);
    await this.domainModel.updateMany(
      { siteId, normalizedDomain: { $nin: normalized } },
      { active: false, isPrimary: false },
    );
    for (const [index, domain] of normalized.entries()) {
      await this.domainModel.findOneAndUpdate(
        { normalizedDomain: domain },
        {
          $set: { domain, siteId, active: true, isPrimary: index === 0 },
          $setOnInsert: {
            verified: false,
            verificationMethod: 'dns',
            verificationStatus: DomainVerificationStatus.PENDING,
            sslStatus: DomainSslStatus.PENDING,
          },
        },
        { upsert: true, new: true, runValidators: true },
      );
    }
  }

  async create(dto: CreateSiteDto, actor: string) {
    try {
      const payload = this.normalizePayload(dto);
      await this.assertAvailable(payload.slug, payload.domains || []);
      const site = await this.model.create(payload);
      await this.syncDomains(site._id, payload.domains || [payload.domain]);
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
  async list() {
    const sites = await this.model.find().sort({ createdAt: -1 }).lean();
    const domains = await this.domainModel
      .find()
      .sort({ isPrimary: -1 })
      .lean();
    return sites.map((site) => ({
      ...site,
      domainRecords: domains.filter(
        (domain) => String(domain.siteId) === String(site._id),
      ),
    }));
  }
  async get(id: string) {
    const site = await this.model.findById(id);
    if (!site) throw new NotFoundException('Site not found');
    const domainRecords = await this.domainModel
      .find({ siteId: site._id })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean();
    return { ...site.toObject(), domainRecords };
  }
  async update(id: string, dto: UpdateSiteDto, actor: string) {
    const current = await this.model.findById(id);
    if (!current) throw new NotFoundException('Site not found');
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
    await this.syncDomains(site._id, payload.domains || [payload.domain]);
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'SITE_UPDATED',
      entityType: 'SITE',
      entityId: site._id,
    });
    return this.get(id);
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
    return this.get(id);
  }
  count() {
    return this.model.countDocuments();
  }

  listActive() {
    return this.model
      .find({ status: SiteStatus.ACTIVE })
      .select(
        'name slug domain domains city state country timezone currency logo favicon tagline description heroTitle heroSubtitle ogImage theme pageConfig seo contact social status',
      )
      .sort({ name: 1 })
      .lean();
  }

  async resolveActiveByDomain(domain: string) {
    const normalized = normalizeDomain(domain);
    const record = await this.domainModel
      .findOne({ normalizedDomain: normalized })
      .lean();
    if (record && !record.active) {
      throw new NotFoundException('Active site not found for domain');
    }
    const site = await this.model
      .findOne(
        record
          ? { _id: record.siteId, status: SiteStatus.ACTIVE }
          : {
              status: SiteStatus.ACTIVE,
              $or: [{ domain: normalized }, { domains: normalized }],
            },
      )
      .select(
        'name slug domain domains city state country timezone currency logo favicon tagline description heroTitle heroSubtitle ogImage theme pageConfig seo contact social status',
      )
      .lean();
    if (!site) throw new NotFoundException('Active site not found for domain');
    return site;
  }

  listDomains(siteId: string) {
    return this.domainModel
      .find({ siteId: new Types.ObjectId(siteId) })
      .sort({ isPrimary: -1, createdAt: 1 })
      .lean();
  }

  async addDomain(siteId: string, dto: CreateSiteDomainDto, actor: string) {
    const site = await this.model.findById(siteId);
    if (!site) throw new NotFoundException('Site not found');
    const normalizedDomain = normalizeDomain(dto.domain);
    if (!normalizedDomain) throw new ConflictException('Invalid domain');
    if (await this.domainModel.exists({ normalizedDomain })) {
      throw new ConflictException('Domain already belongs to a site');
    }
    if (dto.isPrimary) {
      await this.domainModel.updateMany(
        { siteId: site._id },
        { isPrimary: false },
      );
      site.domain = normalizedDomain;
    }
    site.domains = normalizeDomains(site.domain, [
      ...(site.domains || []),
      normalizedDomain,
    ]);
    await site.save();
    const record = await this.domainModel.create({
      siteId: site._id,
      domain: normalizedDomain,
      normalizedDomain,
      isPrimary: Boolean(dto.isPrimary),
      verificationMethod: dto.verificationMethod || 'dns',
    });
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'SITE_DOMAIN_ADDED',
      entityType: 'SITE',
      entityId: site._id,
      metadata: { domain: normalizedDomain },
    });
    return record;
  }

  async updateDomain(
    siteId: string,
    domainId: string,
    dto: UpdateSiteDomainDto,
    actor: string,
  ) {
    const record = await this.domainModel.findOne({
      _id: new Types.ObjectId(domainId),
      siteId: new Types.ObjectId(siteId),
    });
    if (!record) throw new NotFoundException('Site domain not found');
    if (dto.isPrimary) {
      await this.domainModel.updateMany(
        { siteId: record.siteId, _id: { $ne: record._id } },
        { isPrimary: false },
      );
      await this.model.findByIdAndUpdate(siteId, {
        domain: record.normalizedDomain,
      });
    }
    Object.assign(record, dto);
    await record.save();
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'SITE_DOMAIN_UPDATED',
      entityType: 'SITE',
      entityId: record.siteId,
      metadata: { domain: record.normalizedDomain, ...dto },
    });
    return record;
  }
}
