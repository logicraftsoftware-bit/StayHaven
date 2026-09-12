import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'gw_owner_otps', timestamps: true })
export class OwnerOtp {
  @Prop({ required: true, index: true }) phone: string;
  @Prop({
    required: true,
    enum: ['register', 'login', 'forgot-password'],
    index: true,
  })
  purpose: string;
  @Prop({ required: true, select: false }) codeHash: string;
  @Prop({ required: true, index: { expires: 0 } }) expiresAt: Date;
  @Prop({ default: 0 }) attempts: number;
  @Prop({ default: false }) used: boolean;
}

export const OwnerOtpSchema = SchemaFactory.createForClass(OwnerOtp);
