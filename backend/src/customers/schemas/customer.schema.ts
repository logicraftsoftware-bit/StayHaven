import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

@Schema({ collection: 'gw_customers', timestamps: true })
export class Customer {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({
    required: false,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    sparse: true,
  })
  email?: string;
  @Prop({ unique: true, sparse: true, trim: true, index: true })
  phone?: string;
  @Prop({ default: '', select: false }) passwordHash: string;
  @Prop() dateOfBirth?: Date;
  @Prop({ trim: true }) gender?: string;
  @Prop({ trim: true }) nationality?: string;
  @Prop({ trim: true }) city?: string;
  @Prop({ trim: true }) state?: string;
  @Prop({ trim: true }) avatarUrl?: string;
  @Prop({ type: [Object], default: [] }) coTravellers: Array<
    Record<string, unknown>
  >;
  @Prop({ type: [Object], default: [] }) sessions: Array<
    Record<string, unknown>
  >;
  @Prop({ type: String, enum: Role, default: Role.CUSTOMER }) role: Role;
  @Prop({ default: true, index: true }) active: boolean;
  @Prop({ type: Types.ObjectId }) registeredFromSiteId?: Types.ObjectId;
  @Prop() lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
