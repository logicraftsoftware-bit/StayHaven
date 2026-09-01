import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'gw_platform_settings', timestamps: true })
export class PlatformSetting {
  @Prop({ required: true, unique: true, default: 'maps' }) key: string;
  @Prop({ default: '' }) googleMapsBrowserKey: string;
  @Prop({ default: '' }) panelLogo: string;
}
export const PlatformSettingSchema =
  SchemaFactory.createForClass(PlatformSetting);
