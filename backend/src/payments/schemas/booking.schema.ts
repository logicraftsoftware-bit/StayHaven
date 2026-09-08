import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ collection: 'gw_bookings', timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  customerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  propertyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  siteId: Types.ObjectId;
  @Prop({ required: true }) bookingNumber: string;
  @Prop({ required: true }) propertyName: string;
  @Prop({ required: true }) roomId: string;
  @Prop({ required: true }) roomName: string;
  @Prop({ required: true }) guestName: string;
  @Prop({ required: true }) guestEmail: string;
  @Prop({ required: true }) guestPhone: string;
  @Prop({ required: true, index: true }) checkIn: Date;
  @Prop({ required: true, index: true }) checkOut: Date;
  @Prop({ default: 1, min: 1 }) rooms: number;
  @Prop({ default: 1, min: 1 }) adults: number;
  @Prop({ default: 0, min: 0 }) children: number;
  @Prop({ required: true, min: 1 }) nights: number;
  @Prop({ required: true, min: 0 }) roomAmount: number;
  @Prop({ default: 0, min: 0 }) extraGuestAmount: number;
  @Prop({ default: 0, min: 0 }) taxAmount: number;
  @Prop({ required: true, min: 100 }) grossAmount: number;
  @Prop({ required: true, min: 0, max: 100 }) commissionPercent: number;
  @Prop({ required: true, min: 0 }) commissionAmount: number;
  @Prop({ required: true, min: 0 }) ownerNetAmount: number;
  @Prop({ default: 'PAYMENT_PENDING', index: true }) status: string;
  @Prop({ default: 'PENDING', index: true }) paymentStatus: string;
  @Prop({ default: 'PENDING', index: true }) settlementStatus: string;
  @Prop({ required: true, unique: true, index: true }) razorpayOrderId: string;
  @Prop({ sparse: true, unique: true }) razorpayPaymentId?: string;
  @Prop() paidAt?: Date;
  @Prop() settledAt?: Date;
  @Prop() cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export type BookingDocument = HydratedDocument<Booking>;
export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ ownerId: 1, propertyId: 1, checkIn: -1 });
