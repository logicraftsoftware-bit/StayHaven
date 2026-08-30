import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { OwnerStatus } from '../../common/enums/status.enum';
@Schema({ collection: 'gw_owners', timestamps: true })
export class Owner {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;
  @Prop({ required: true, index: true }) phone: string;
  @Prop() businessName?: string;
  @Prop() address?: string;
  @Prop() profileImage?: string;
  @Prop({ default: false }) emailVerified: boolean;
  @Prop({ default: false }) phoneVerified: boolean;
  @Prop({ type: Types.ObjectId }) registeredFromSiteId?: Types.ObjectId;
  @Prop() lastLoginAt?: Date;
  @Prop({ required: true, select: false }) passwordHash: string;
  @Prop({ type: String, enum: Role, default: Role.HOTEL_OWNER }) role: Role;
  @Prop({
    type: String,
    enum: OwnerStatus,
    default: OwnerStatus.PENDING,
    index: true,
  })
  status: OwnerStatus;
  createdAt: Date;
  updatedAt: Date;
}
export const OwnerSchema = SchemaFactory.createForClass(Owner);
