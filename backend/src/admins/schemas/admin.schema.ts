import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AdminStatus } from '../../common/enums/status.enum';
import { Role } from '../../common/enums/role.enum';
@Schema({
  collection: 'gw_admins',
  timestamps: true,
  toJSON: {
    transform: (_d, r) => {
      delete (r as Record<string, unknown>).passwordHash;
      return r;
    },
  },
})
export class Admin {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;
  @Prop({ required: true, select: false }) passwordHash: string;
  @Prop({ type: String, enum: Role, default: Role.SUPER_ADMIN }) role: Role;
  @Prop({ type: String, enum: AdminStatus, default: AdminStatus.ACTIVE })
  status: AdminStatus;
  @Prop() avatar?: string;
  @Prop() panelLogo?: string;
  @Prop({ enum: ['MAIN_ADMIN', 'BRANCH_ADMIN', 'USER'] })
  adminLevel?: 'MAIN_ADMIN' | 'BRANCH_ADMIN' | 'USER';
  @Prop({ type: [String], default: [] }) permissions: string[];
  @Prop({ type: [Types.ObjectId], ref: 'Site', default: [] })
  siteIds: Types.ObjectId[];
  @Prop({ type: Types.ObjectId, ref: 'Admin' }) createdBy?: Types.ObjectId;
  @Prop() lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export type AdminDocument = HydratedDocument<Admin>;
export const AdminSchema = SchemaFactory.createForClass(Admin);
