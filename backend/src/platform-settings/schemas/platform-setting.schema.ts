import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'gw_platform_settings', timestamps: true })
export class PlatformSetting {
  @Prop({ required: true, unique: true, default: 'maps' }) key: string;
  @Prop({ default: '' }) googleMapsBrowserKey: string;
  @Prop({ default: '' }) panelLogo: string;
  @Prop({ default: '', select: false }) razorpayKeyId: string;
  @Prop({ default: '', select: false }) razorpayKeySecret: string;
  @Prop({ default: '', select: false }) razorpayWebhookSecret: string;
  @Prop({ default: '', select: false }) razorpayXAccountNumber: string;
  @Prop({ default: false }) razorpayLiveMode: boolean;
  @Prop({ default: 1000, min: 1000 }) minimumWithdrawalAmount: number;
}
export const PlatformSettingSchema =
  SchemaFactory.createForClass(PlatformSetting);
