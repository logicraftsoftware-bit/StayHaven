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
  @Prop({ default: 'RAZORPAY', enum: ['RAZORPAY', 'CASHFREE'] })
  activePaymentGateway: string;
  @Prop({ default: '', select: false }) cashfreeAppId: string;
  @Prop({ default: '', select: false }) cashfreeSecretKey: string;
  @Prop({ default: '', select: false }) cashfreeWebhookSecret: string;
  @Prop({ default: '', select: false }) cashfreePayoutClientId: string;
  @Prop({ default: '', select: false }) cashfreePayoutClientSecret: string;
  @Prop({ default: false }) cashfreeLiveMode: boolean;
  @Prop({ default: '' }) aiSensyApiUrl: string;
  @Prop({ default: '', select: false }) aiSensyApiKey: string;
  @Prop({ default: 'Homestay OTP Verification' }) aiSensyOtpCampaign: string;
}
export const PlatformSettingSchema =
  SchemaFactory.createForClass(PlatformSetting);
