import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
@Schema({
  collection: 'gw_audit_logs',
  timestamps: { createdAt: true, updatedAt: false },
})
export class AuditLog {
  @Prop({ type: Types.ObjectId, index: true }) actorId: Types.ObjectId;
  @Prop({ type: String, enum: Role }) actorRole: Role;
  @Prop({ required: true, index: true }) action: string;
  @Prop({ required: true }) entityType: string;
  @Prop({ type: Types.ObjectId, index: true }) entityId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId }) siteId?: Types.ObjectId;
  @Prop({ type: Object, default: {} }) metadata: Record<string, unknown>;
  @Prop() ipAddress?: string;
  @Prop() userAgent?: string;
  createdAt: Date;
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ action: 1, createdAt: -1 });
