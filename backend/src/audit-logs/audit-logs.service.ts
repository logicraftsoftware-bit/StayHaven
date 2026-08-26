import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';
@Injectable()
export class AuditLogsService {
  constructor(@InjectModel(AuditLog.name) private model: Model<AuditLog>) {}
  async record(data: Partial<AuditLog>) {
    await this.model.create(data);
  }
}
