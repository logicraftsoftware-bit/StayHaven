import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
@Schema({ collection: 'gw_owner_team_members', timestamps: true })
export class TeamMember {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ required: true }) name: string;
  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
    index: true,
  })
  email: string;
  @Prop() phone?: string;
  @Prop({ enum: ['active', 'inactive'], default: 'active' }) status: string;
  @Prop({ type: [String], default: [] }) permissions: string[];
  @Prop({ type: [Types.ObjectId], default: [] })
  assignedPropertyIds: Types.ObjectId[];
  @Prop({ required: true, select: false }) passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
export const TeamMemberSchema = SchemaFactory.createForClass(TeamMember);
TeamMemberSchema.index({ ownerId: 1, createdAt: -1 });
