import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'gw_guest_reviews', timestamps: true })
export class GuestReview {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  bookingId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  propertyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  siteId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true }) ownerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true }) customerId: Types.ObjectId;
  @Prop({ required: true }) bookingNumber: string;
  @Prop({ required: true }) guestName: string;
  @Prop({ required: true }) roomName: string;
  @Prop({ required: true, min: 1, max: 5 }) rating: number;
  @Prop({ default: '' }) comment: string;
  @Prop({ type: Object, default: {} }) categories: Record<string, number>;
  @Prop({ default: '' }) ownerReply: string;
  @Prop() repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export const GuestReviewSchema = SchemaFactory.createForClass(GuestReview);
GuestReviewSchema.index({ propertyId: 1, createdAt: -1 });
