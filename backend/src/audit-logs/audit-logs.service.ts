import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';
@Injectable()
export class AuditLogsService {
  constructor(@InjectModel(AuditLog.name) private model: Model<AuditLog>) {}
  async record(data: Partial<AuditLog>) {
    await this.model.create(data);
  }

  history(
    entityType: string,
    entityId: string,
    limit = 50,
  ): Promise<AuditLog[]> {
    return this.model
      .find({ entityType, entityId: new Types.ObjectId(entityId) })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 100))
      .lean<AuditLog[]>();
  }
}
