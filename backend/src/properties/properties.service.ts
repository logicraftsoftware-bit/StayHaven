import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { PropertyStatus } from '../common/enums/status.enum';
import { PropertyQueryDto } from './dto/property.dto';
import { Property } from './schemas/property.schema';
const transitions: Record<PropertyStatus, PropertyStatus[]> = {
  [PropertyStatus.DRAFT]: [PropertyStatus.PENDING],
  [PropertyStatus.PENDING]: [
    PropertyStatus.APPROVED,
    PropertyStatus.REJECTED,
    PropertyStatus.CHANGES_REQUIRED,
  ],
  [PropertyStatus.APPROVED]: [PropertyStatus.SUSPENDED],
  [PropertyStatus.REJECTED]: [PropertyStatus.PENDING],
  [PropertyStatus.CHANGES_REQUIRED]: [PropertyStatus.PENDING],
  [PropertyStatus.SUSPENDED]: [PropertyStatus.APPROVED],
};
@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private model: Model<Property>,
    private audit: AuditLogsService,
  ) {}
  async list(q: PropertyQueryDto) {
    const filter: {
      status?: PropertyStatus;
      siteId?: string;
      ownerId?: string;
      $or?: Array<Record<string, unknown>>;
    } = {};
    if (q.status) filter.status = q.status;
    if (q.siteId) filter.siteId = q.siteId;
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
    const p = await this.model.findById(id);
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }
  async transition(
    id: string,
    status: PropertyStatus,
    actor: string,
    reason?: string,
  ) {
    const p = await this.get(id);
    if (!transitions[p.status].includes(status))
      throw new BadRequestException(
        `Invalid transition from ${p.status} to ${status}`,
      );
    p.status = status;
    p.reviewReason = reason;
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
      metadata: reason ? { reason } : {},
    });
    return p;
  }
  count(status?: PropertyStatus) {
    return this.model.countDocuments(status ? { status } : {});
  }
}
