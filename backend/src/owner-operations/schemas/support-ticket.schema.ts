import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
@Schema({ collection: 'gw_support_tickets', timestamps: true })
export class SupportTicket {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, index: true }) propertyId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, index: true }) siteId?: Types.ObjectId;
  @Prop({ required: true }) category: string;
  @Prop({ required: true }) subject: string;
  @Prop({ required: true }) description: string;
  @Prop({ type: [String], default: [] }) attachments: string[];
  @Prop({ enum: ['low', 'normal', 'high'], default: 'normal' })
  priority: string;
  @Prop({
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true,
  })
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ ownerId: 1, createdAt: -1 });
