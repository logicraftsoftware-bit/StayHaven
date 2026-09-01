import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { OwnerStatus } from '../common/enums/status.enum';
import { OwnerQueryDto } from './dto/owner.dto';
import { Owner } from './schemas/owner.schema';
import * as bcrypt from 'bcrypt';
import { SitesService } from '../sites/sites.service';
import {
  OwnerLoginDto,
  RegisterOwnerDto,
  UpdateOwnerProfileDto,
} from './dto/owner-account.dto';

type OwnerAdminDetail = Owner & {
  _id: Types.ObjectId;
  properties: Array<Record<string, unknown>>;
  sites: Array<{ _id: Types.ObjectId; name: string }>;
  auditHistory: Awaited<ReturnType<AuditLogsService['history']>>;
};

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
@Injectable()
export class OwnersService {
  constructor(
    @InjectModel(Owner.name) private model: Model<Owner>,
    private audit: AuditLogsService,
    private jwt: JwtService,
    private sites: SitesService,
  ) {}
  async list(q: OwnerQueryDto, allowedSiteIds?: string[]) {
    const match: Record<string, unknown> = {};
    if (q.status) match.status = q.status;
    if (q.search)
      match.$or = [
        { name: { $regex: q.search, $options: 'i' } },
        { email: { $regex: q.search, $options: 'i' } },
      ];
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'gw_properties',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'properties',
        },
      },
    ];
    if (q.siteId)
      pipeline.push({
        $match: {
          properties: { $elemMatch: { siteId: new Types.ObjectId(q.siteId) } },
        },
      });
    else if (allowedSiteIds)
      pipeline.push({
        $match: {
          properties: { $elemMatch: { siteId: { $in: allowedSiteIds.map((id) => new Types.ObjectId(id)) } } },
        },
      });
    pipeline.push(
      {
        $addFields: {
          propertyCount: { $size: '$properties' },
          siteIds: { $setUnion: ['$properties.siteId', []] },
        },
      },
      { $project: { passwordHash: 0, properties: 0 } },
      { $sort: { createdAt: -1 } },
    );
    return this.model.aggregate(pipeline);
  }
  async get(id: string): Promise<OwnerAdminDetail> {
    const [owner] = await this.model.aggregate<
      Omit<OwnerAdminDetail, 'auditHistory'>
    >([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'gw_properties',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'properties',
        },
      },
      {
        $lookup: {
          from: 'gw_sites',
          localField: 'properties.siteId',
          foreignField: '_id',
          as: 'sites',
        },
      },
      {
        $project: {
          passwordHash: 0,
          'properties.ownerId': 0,
          'sites.domains': 0,
          'sites.theme': 0,
          'sites.seo': 0,
        },
      },
    ]);
    if (!owner) throw new NotFoundException('Owner not found');
    return {
      ...owner,
      auditHistory: await this.audit.history('OWNER', id),
    };
  }
  async status(id: string, status: OwnerStatus, actor: string) {
    const owner = await this.model.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!owner) throw new NotFoundException('Owner not found');
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'OWNER_STATUS_CHANGED',
      entityType: 'OWNER',
      entityId: owner._id,
      metadata: { status },
    });
    return owner;
  }
  async count(status?: OwnerStatus, siteIds?: string[]) {
    if (!siteIds) return this.model.countDocuments(status ? { status } : {});
    const match: Record<string, unknown> = status ? { status } : {};
    const result = await this.model.aggregate([
      { $match: match },
      { $lookup: { from: 'gw_properties', localField: '_id', foreignField: 'ownerId', as: 'properties' } },
      { $match: { properties: { $elemMatch: { siteId: { $in: siteIds.map((id) => new Types.ObjectId(id)) } } } } },
      { $count: 'total' },
    ]);
    return result[0]?.total || 0;
  }

  async ensureAccess(id: string) {
    const owner = await this.model.findById(id).select('status').lean();
    if (
      !owner ||
      [OwnerStatus.SUSPENDED, OwnerStatus.REJECTED].includes(owner.status)
    )
      throw new UnauthorizedException('Owner account is not available');
  }

  async register(
    dto: RegisterOwnerDto,
    context: { siteId?: string; ip?: string; userAgent?: string },
  ) {
    const email = dto.email.trim().toLowerCase();
    if (await this.model.exists({ email }))
      throw new ConflictException(
        'An owner account already exists. Please log in.',
      );
    const registeredFromSiteId = context.siteId
      ? new Types.ObjectId(context.siteId)
      : undefined;
    let owner: Owner & { _id: Types.ObjectId };
    try {
      owner = await this.model.create({
        name: dto.name.trim(),
        email,
        phone: dto.phone.trim(),
        businessName: dto.businessName?.trim(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: Role.HOTEL_OWNER,
        registeredFromSiteId,
      });
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictException(
          'An owner account already exists. Please log in.',
        );
      throw error;
    }
    await this.audit.record({
      actorId: owner._id,
      actorRole: Role.HOTEL_OWNER,
      action: 'OWNER_REGISTERED',
      entityType: 'OWNER',
      entityId: owner._id,
      siteId: registeredFromSiteId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
    return this.session(owner);
  }

  async login(
    dto: OwnerLoginDto,
    context: { ip?: string; userAgent?: string },
  ) {
    const owner = await this.model
      .findOne({ email: dto.email.trim().toLowerCase() })
      .select('+passwordHash');
    if (
      !owner ||
      [OwnerStatus.SUSPENDED, OwnerStatus.REJECTED].includes(owner.status) ||
      !(await bcrypt.compare(dto.password, owner.passwordHash))
    )
      throw new UnauthorizedException('Invalid owner credentials');
    owner.lastLoginAt = new Date();
    await owner.save();
    await this.audit.record({
      actorId: owner._id,
      actorRole: Role.HOTEL_OWNER,
      action: 'OWNER_LOGIN',
      entityType: 'OWNER',
      entityId: owner._id,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
    return this.session(owner);
  }

  async me(id: string) {
    const owner = await this.model.findById(id).lean();
    if (!owner) throw new NotFoundException('Owner not found');
    return owner;
  }

  async updateProfile(id: string, dto: UpdateOwnerProfileDto) {
    const owner = await this.model.findByIdAndUpdate(id, dto, { new: true });
    if (!owner) throw new NotFoundException('Owner not found');
    await this.audit.record({
      actorId: owner._id,
      actorRole: Role.HOTEL_OWNER,
      action: 'OWNER_PROFILE_UPDATED',
      entityType: 'OWNER',
      entityId: owner._id,
    });
    return owner;
  }

  availableSites() {
    return this.sites.listActive();
  }

  private async session(owner: Owner & { _id: Types.ObjectId }) {
    const accessToken = await this.jwt.signAsync({
      sub: String(owner._id),
      role: Role.HOTEL_OWNER,
    });
    return {
      accessToken,
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        businessName: owner.businessName,
        status: owner.status,
        role: owner.role,
      },
    };
  }
}
