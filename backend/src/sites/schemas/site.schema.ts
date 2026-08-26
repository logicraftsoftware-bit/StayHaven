import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SiteStatus } from '../../common/enums/status.enum';
@Schema({ timestamps: true })
export class Site {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  domain: string;
  @Prop() logo?: string;
  @Prop() favicon?: string;
  @Prop({ required: true }) city: string;
  @Prop({ required: true }) state: string;
  @Prop({ default: 'India' }) country: string;
  @Prop({ type: String, enum: SiteStatus, default: SiteStatus.ACTIVE })
  status: SiteStatus;
  @Prop({ type: Object, default: {} }) theme: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}
export type SiteDocument = HydratedDocument<Site>;
export const SiteSchema = SchemaFactory.createForClass(Site);
