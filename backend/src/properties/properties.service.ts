import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { PropertyStatus } from '../common/enums/status.enum';
import { PropertyQueryDto } from './dto/property.dto';
import { Property, PropertyDocument } from './schemas/property.schema';
import { SitesService } from '../sites/sites.service';
import { PropertyTypesService } from '../property-types/property-types.service';
import {
  CreateOwnerPropertyDto,
  OwnerPropertyQueryDto,
  UpdateOwnerPropertyDto,
} from './dto/property.dto';
const transitions: Record<PropertyStatus, PropertyStatus[]> = {
  [PropertyStatus.DRAFT]: [PropertyStatus.PENDING],
  [PropertyStatus.PENDING]: [
    PropertyStatus.APPROVED,
    PropertyStatus.REJECTED,
    PropertyStatus.CHANGES_REQUIRED,
  ],
  [PropertyStatus.APPROVED]: [
    PropertyStatus.SUSPENDED,
    PropertyStatus.CHANGES_REQUIRED,
  ],
  [PropertyStatus.REJECTED]: [PropertyStatus.PENDING],
  [PropertyStatus.CHANGES_REQUIRED]: [PropertyStatus.PENDING],
  [PropertyStatus.SUSPENDED]: [PropertyStatus.APPROVED],
};

type OwnerSummaryRow = {
  _id: { status: PropertyStatus; siteId: Types.ObjectId };
  count: number;
};
const sectionFields: Record<string, string[]> = {
  'Property Type': ['propertyTypeId', 'propertyType'],
  'Basic Info': ['name', 'displayName', 'description', 'basicInfo'],
  Location: [
    'siteId',
    'address',
    'city',
    'state',
    'country',
    'locationDetails',
    'location',
  ],
  'Rooms & Spaces': ['roomDetails', 'rooms', 'maxGuests', 'price', 'taxes'],
  'Photos & Videos': ['media'],
  Amenities: ['amenities'],
  'Meals & Policies': ['mealPlans', 'policies'],
  'Finance & Legal': ['financeLegal', 'documents', 'seo'],
};
const ownerEditableFields = [...new Set(Object.values(sectionFields).flat())];
@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private model: Model<Property>,
    private audit: AuditLogsService,
    private sites: SitesService,
    private propertyTypes: PropertyTypesService,
    @Optional() private config?: ConfigService,
  ) {}
  async list(q: PropertyQueryDto, allowedSiteIds?: string[]) {
    const filter: {
      status?: PropertyStatus;
      siteId?: string | { $in: Types.ObjectId[] };
      ownerId?: string;
      $or?: Array<Record<string, unknown>>;
    } = {};
    if (q.status) filter.status = q.status;
    if (q.siteId) filter.siteId = q.siteId;
    else if (allowedSiteIds)
      filter.siteId = {
        $in: allowedSiteIds.map((id) => new Types.ObjectId(id)),
      };
    if (q.ownerId) filter.ownerId = q.ownerId;
    if (q.search)
      filter.$or = [
        { name: { $regex: q.search, $options: 'i' } },
        { city: { $regex: q.search, $options: 'i' } },
      ];
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .sort({ createdAt: -1 }),
      this.model.countDocuments(filter),
    ]);
    return {
      data,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }
  async get(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid property ID');
    const query = this.model.findById(id);
    const p =
      typeof (query as unknown as { select?: unknown }).select === 'function'
        ? await query.select('+financeLegal +documents +pendingChanges')
        : await query;
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }
  async transition(
    id: string,
    status: PropertyStatus,
    actor: string,
    reason?: string,
    sections?: string[],
  ) {
    const p = await this.get(id);
    const hasLiveRevision =
      p.status === PropertyStatus.APPROVED &&
      Boolean(Object.keys(p.pendingChanges || {}).length);
    if (hasLiveRevision && status === PropertyStatus.APPROVED) {
      for (const [key, value] of Object.entries(p.pendingChanges || {}))
        (p as unknown as Record<string, unknown>)[key] = value;
      p.completeness = this.completeness(p);
      p.pendingChanges = {};
      p.pendingUpdateStatus = undefined;
      p.pendingReviewSections = [];
      p.pendingReviewReason = undefined;
      p.reviewHistory = [
        ...(p.reviewHistory || []),
        {
          status: PropertyStatus.APPROVED,
          reason: 'Live property revision approved',
          actorId: actor,
          createdAt: new Date(),
        },
      ];
      await p.save();
      await this.audit.record({
        actorId: new Types.ObjectId(actor),
        actorRole: Role.SUPER_ADMIN,
        action: 'PROPERTY_LIVE_UPDATE_APPROVED',
        entityType: 'PROPERTY',
        entityId: p._id,
        siteId: p.siteId,
      });
      return p;
    }
    if (hasLiveRevision && status === PropertyStatus.CHANGES_REQUIRED) {
      p.pendingUpdateStatus = 'CHANGES_REQUIRED';
      p.pendingReviewReason = reason;
      p.pendingReviewSections = sections?.length
        ? sections
        : p.pendingReviewSections;
      await p.save();
      await this.audit.record({
        actorId: new Types.ObjectId(actor),
        actorRole: Role.SUPER_ADMIN,
        action: 'PROPERTY_LIVE_UPDATE_CHANGES_REQUESTED',
        entityType: 'PROPERTY',
        entityId: p._id,
        siteId: p.siteId,
        metadata: { reason: reason || '', sections: sections || [] },
      });
      return p;
    }
    if (!transitions[p.status].includes(status))
      throw new BadRequestException(
        `Invalid transition from ${p.status} to ${status}`,
      );
    p.status = status;
    p.reviewReason = reason;
    p.reviewSections =
      status === PropertyStatus.CHANGES_REQUIRED ? sections || [] : [];
    p.reviewHistory = [
      ...(p.reviewHistory || []),
      {
        status,
        reason: reason || '',
        sections: sections || [],
        actorId: actor,
        createdAt: new Date(),
      },
    ];
    await p.save();
    const actions = {
      [PropertyStatus.APPROVED]: 'PROPERTY_APPROVED',
      [PropertyStatus.REJECTED]: 'PROPERTY_REJECTED',
      [PropertyStatus.CHANGES_REQUIRED]: 'PROPERTY_CHANGES_REQUESTED',
      [PropertyStatus.SUSPENDED]: 'PROPERTY_SUSPENDED',
    } as Partial<Record<PropertyStatus, string>>;
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: actions[status] || 'PROPERTY_STATUS_CHANGED',
      entityType: 'PROPERTY',
      entityId: p._id,
      siteId: p.siteId,
      metadata: reason ? { reason, sections: sections || [] } : {},
    });
    return p;
  }
  count(status?: PropertyStatus, siteIds?: string[]) {
    const filter: Record<string, unknown> = status ? { status } : {};
    if (siteIds)
      filter.siteId = { $in: siteIds.map((id) => new Types.ObjectId(id)) };
    return this.model.countDocuments(filter);
  }

  listPublic(siteId: string) {
    return this.model
      .find({
        siteId: new Types.ObjectId(siteId),
        status: PropertyStatus.APPROVED,
        active: { $ne: false },
      })
      .select(
        'name displayName slug propertyType propertyTypeId description address city state country location status price amenities media roomDetails policies mealPlans seo',
      )
      .sort({ createdAt: -1 })
      .lean();
  }

  async getPublicBySlug(siteId: string, slug: string) {
    const property = await this.model
      .findOne({
        siteId: new Types.ObjectId(siteId),
        slug,
        status: PropertyStatus.APPROVED,
        active: { $ne: false },
      })
      .select(
        'name displayName slug propertyType propertyTypeId description address city state country location status price amenities media roomDetails policies mealPlans seo',
      )
      .lean();
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async listOwner(ownerId: string, query: OwnerPropertyQueryDto) {
    const filter: Record<string, unknown> = {
      ownerId: new Types.ObjectId(ownerId),
    };
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.status) filter.status = query.status;
    return this.model
      .find(filter)
      .populate('siteId', 'name slug domain city state status')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getOwner(ownerId: string, id: string) {
    const query = this.model.findOne({
      _id: new Types.ObjectId(id),
      ownerId: new Types.ObjectId(ownerId),
    });
    const property =
      typeof (query as unknown as { select?: unknown }).select === 'function'
        ? await query.select('+financeLegal +documents +pendingChanges')
        : await query;
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async getOwnerView(ownerId: string, id: string) {
    const property = await this.getOwner(ownerId, id);
    return this.ownerViewValue(property);
  }

  private ownerViewValue(property: PropertyDocument) {
    const value = property.toObject() as unknown as Record<string, unknown>;
    value.financeLegal = this.decrypt(String(property.financeLegal || ''));
    const pending = this.pendingViewValue(property.pendingChanges || {});
    Object.assign(value, pending);
    value.pendingChanges = pending;
    return value;
  }

  async getAdminView(id: string) {
    const property = await this.get(id);
    const value = property.toObject() as unknown as Record<string, unknown>;
    value.financeLegal = this.decrypt(String(property.financeLegal || ''));
    value.pendingChanges = this.pendingViewValue(property.pendingChanges || {});
    return value;
  }

  async createOwner(
    ownerId: string,
    dto: CreateOwnerPropertyDto,
    resolvedSiteId?: string,
  ) {
    const siteId = dto.siteId || resolvedSiteId;
    if (!siteId) throw new BadRequestException('Marketplace site is required');
    await this.sites.getActive(siteId);
    let propertyType = dto.propertyType;
    if (dto.propertyTypeId) {
      const master = await this.propertyTypes.getActive(dto.propertyTypeId);
      propertyType = master.name;
    }
    if (!propertyType)
      throw new BadRequestException('Property type is required');
    const slug = `${(dto.name || 'draft-property')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
    const property = await this.model.create({
      ...dto,
      financeLegal: this.encrypt(dto.financeLegal || {}),
      propertyType,
      ownerId: new Types.ObjectId(ownerId),
      siteId: new Types.ObjectId(siteId),
      slug,
      status: PropertyStatus.DRAFT,
      country: dto.country || 'India',
    });
    property.completeness = this.completeness(property);
    if (dto.submit) {
      this.assertComplete(property);
      property.status = PropertyStatus.PENDING;
    }
    await property.save();
    await this.auditOwner('PROPERTY_CREATED', property, ownerId, {
      submitted: Boolean(dto.submit),
    });
    return this.ownerViewValue(property);
  }

  async updateOwner(ownerId: string, id: string, dto: UpdateOwnerPropertyDto) {
    const property = await this.getOwner(ownerId, id);
    if (
      ![
        PropertyStatus.DRAFT,
        PropertyStatus.REJECTED,
        PropertyStatus.CHANGES_REQUIRED,
        PropertyStatus.APPROVED,
      ].includes(property.status)
    )
      throw new BadRequestException(
        'Property cannot be edited in its current status',
      );
    if (property.status === PropertyStatus.APPROVED)
      return this.updateApprovedProperty(property, ownerId, dto);
    const oldSiteId = String(property.siteId);
    if (property.status === PropertyStatus.CHANGES_REQUIRED)
      this.assertRequestedSections(property, dto);
    if (dto.siteId) {
      await this.sites.getActive(dto.siteId);
      property.siteId = new Types.ObjectId(dto.siteId);
    }
    if (dto.propertyTypeId) {
      const master = await this.propertyTypes.getActive(dto.propertyTypeId);
      property.propertyTypeId = new Types.ObjectId(dto.propertyTypeId);
      property.propertyType = master.name;
    }
    const updates = dto as unknown as Record<string, unknown>;
    for (const key of ownerEditableFields)
      if (updates[key] !== undefined)
        (property as unknown as Record<string, unknown>)[key] = updates[key];
    if (dto.financeLegal !== undefined)
      property.financeLegal = this.encrypt(dto.financeLegal);
    property.completeness = this.completeness(property);
    if (dto.submit) {
      this.assertComplete(property);
      property.status = PropertyStatus.PENDING;
      property.reviewReason = undefined;
      property.reviewSections = [];
      property.reviewHistory = [
        ...(property.reviewHistory || []),
        {
          status: PropertyStatus.PENDING,
          actorId: ownerId,
          createdAt: new Date(),
        },
      ];
    }
    await property.save();
    await this.auditOwner('PROPERTY_UPDATED', property, ownerId, {
      siteChanged: oldSiteId !== String(property.siteId),
      submitted: Boolean(dto.submit),
    });
    return this.ownerViewValue(property);
  }

  private async updateApprovedProperty(
    property: PropertyDocument,
    ownerId: string,
    dto: UpdateOwnerPropertyDto,
  ) {
    const incoming = { ...dto } as Record<string, unknown>;
    delete incoming.submit;
    if (dto.siteId) await this.sites.getActive(dto.siteId);
    if (dto.propertyTypeId) {
      const master = await this.propertyTypes.getActive(dto.propertyTypeId);
      incoming.propertyType = master.name;
    }

    const live = property.toObject() as unknown as Record<string, unknown>;
    live.financeLegal = this.decrypt(String(property.financeLegal || ''));
    const pending = this.pendingViewValue(property.pendingChanges || {});
    const candidate = { ...pending };
    for (const key of ownerEditableFields) {
      if (incoming[key] === undefined) continue;
      if (this.sameValue(incoming[key], live[key])) delete candidate[key];
      else candidate[key] = incoming[key];
    }

    if (dto.submit)
      this.assertComplete({ ...live, ...candidate } as unknown as Property);

    const storedPending = { ...candidate };
    if (candidate.financeLegal !== undefined)
      storedPending.financeLegal = this.encrypt(
        candidate.financeLegal as Record<string, unknown>,
      );
    property.pendingChanges = storedPending;
    property.pendingReviewSections = Object.entries(sectionFields)
      .filter(([, fields]) => fields.some((field) => field in candidate))
      .map(([section]) => section);
    property.pendingUpdateStatus = Object.keys(candidate).length
      ? dto.submit
        ? 'PENDING'
        : property.pendingUpdateStatus || 'DRAFT'
      : undefined;
    if (dto.submit) property.pendingReviewReason = undefined;
    await property.save();
    await this.auditOwner('PROPERTY_LIVE_UPDATE_SAVED', property, ownerId, {
      submitted: Boolean(dto.submit),
      sections: property.pendingReviewSections,
    });
    return this.ownerViewValue(property);
  }

  private pendingViewValue(value: Record<string, unknown>) {
    const pending = { ...value };
    if (typeof pending.financeLegal === 'string')
      pending.financeLegal = this.decrypt(pending.financeLegal);
    return pending;
  }

  private sameValue(left: unknown, right: unknown) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  private assertRequestedSections(
    property: PropertyDocument,
    dto: UpdateOwnerPropertyDto,
  ) {
    const requested = property.reviewSections || [];
    if (!requested.length) return;
    const allowed = new Set(
      requested.flatMap((name) => sectionFields[name] || []),
    );
    const submitted = Object.keys(dto).filter(
      (key) =>
        key !== 'submit' &&
        dto[key as keyof UpdateOwnerPropertyDto] !== undefined,
    );
    const blocked = submitted.filter((key) => !allowed.has(key));
    if (blocked.length)
      throw new BadRequestException(
        `Only requested sections can be edited: ${requested.join(', ')}`,
      );
  }

  async deleteOwner(ownerId: string, id: string) {
    const property = await this.getOwner(ownerId, id);
    if (
      ![PropertyStatus.DRAFT, PropertyStatus.REJECTED].includes(property.status)
    )
      throw new BadRequestException(
        'Only draft or rejected properties can be deleted',
      );
    await property.deleteOne();
    await this.auditOwner('PROPERTY_DELETED', property, ownerId);
    return { id };
  }

  async ownerSummary(ownerId: string): Promise<OwnerSummaryRow[]> {
    const rows = await this.model.aggregate<OwnerSummaryRow>([
      { $match: { ownerId: new Types.ObjectId(ownerId) } },
      {
        $group: {
          _id: { status: '$status', siteId: '$siteId' },
          count: { $sum: 1 },
        },
      },
    ]);
    return rows;
  }

  private async auditOwner(
    action: string,
    property: Property & { _id: Types.ObjectId },
    ownerId: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.audit.record({
      actorId: new Types.ObjectId(ownerId),
      actorRole: Role.HOTEL_OWNER,
      action,
      entityType: 'PROPERTY',
      entityId: property._id,
      siteId: property.siteId,
      metadata,
    });
  }

  private completeness(property: Property) {
    const checks = [
      property.name,
      property.propertyTypeId || property.propertyType,
      property.address,
      property.city,
      property.state,
      property.description,
      property.roomDetails?.length,
      property.media?.length,
      property.amenities?.length,
      Object.keys(property.policies || {}).length,
      Boolean(property.financeLegal),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private assertComplete(property: Property) {
    const missing: string[] = [];
    if (!property.name) missing.push('property name');
    if (!property.propertyTypeId && !property.propertyType)
      missing.push('property type');
    if (!property.address || !property.city || !property.state)
      missing.push('location');
    if (!property.roomDetails?.length) missing.push('at least one room');
    if (!property.media?.some((item) => item.mediaType === 'image'))
      missing.push('property photo');
    if (missing.length)
      throw new BadRequestException(
        `Complete before submission: ${missing.join(', ')}`,
      );
  }

  private encryptionKey() {
    const secret = this.config?.get<string>('jwt.secret');
    if (!secret)
      throw new Error('Sensitive-data encryption key is unavailable');
    return createHash('sha256').update(secret).digest();
  }

  private encrypt(value: Record<string, unknown>) {
    if (!Object.keys(value).length) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value)),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  private decrypt(value: string): Record<string, unknown> {
    if (!value) return {};
    try {
      const [version, iv, tag, encrypted] = value.split('.');
      if (version !== 'v1') return {};
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(encrypted, 'base64url')),
          decipher.final(),
        ]).toString(),
      ) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
