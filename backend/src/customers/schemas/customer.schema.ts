import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

@Schema({ collection: 'gw_customers', timestamps: true })
export class Customer {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;
  @Prop({ trim: true }) phone?: string;
  @Prop({ required: true, select: false }) passwordHash: string;
  @Prop({ type: String, enum: Role, default: Role.CUSTOMER }) role: Role;
  @Prop({ default: true, index: true }) active: boolean;
  @Prop({ type: Types.ObjectId }) registeredFromSiteId?: Types.ObjectId;
  @Prop() lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
