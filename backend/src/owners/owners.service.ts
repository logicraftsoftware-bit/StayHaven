import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { OwnerStatus } from '../common/enums/status.enum';
import { OwnerQueryDto } from './dto/owner.dto';
import { Owner } from './schemas/owner.schema';
@Injectable()
export class OwnersService {
  constructor(
    @InjectModel(Owner.name) private model: Model<Owner>,
    private audit: AuditLogsService,
  ) {}
  list(q: OwnerQueryDto) {
    const f: {
      status?: OwnerStatus;
      siteIds?: string;
      $or?: Array<Record<string, unknown>>;
    } = {};
    if (q.status) f.status = q.status;
    if (q.siteId) f.siteIds = q.siteId;
    if (q.search)
      f.$or = [
        { name: { $regex: q.search, $options: 'i' } },
        { email: { $regex: q.search, $options: 'i' } },
      ];
    return this.model.find(f).sort({ createdAt: -1 });
  }
  async get(id: string) {
    const owner = await this.model.findById(id);
    if (!owner) throw new NotFoundException('Owner not found');
    return owner;
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
  count(status?: OwnerStatus) {
    return this.model.countDocuments(status ? { status } : {});
  }
}
