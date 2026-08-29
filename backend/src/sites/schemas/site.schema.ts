import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SiteStatus } from '../../common/enums/status.enum';
@Schema({ collection: 'gw_sites', timestamps: true })
export class Site {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  domain: string;
  @Prop({ type: [String], default: [], index: true }) domains: string[];
  @Prop() logo?: string;
  @Prop() favicon?: string;
  @Prop() tagline?: string;
  @Prop() description?: string;
  @Prop() heroTitle?: string;
  @Prop() heroSubtitle?: string;
  @Prop() ogImage?: string;
  @Prop({ required: true }) city: string;
  @Prop({ required: true }) state: string;
  @Prop({ default: 'India' }) country: string;
  @Prop({ default: 'Asia/Kolkata' }) timezone: string;
  @Prop({ default: 'INR' }) currency: string;
  @Prop({ type: String, enum: SiteStatus, default: SiteStatus.ACTIVE })
  status: SiteStatus;
  @Prop({ type: Object, default: {} }) theme: Record<string, unknown>;
  @Prop({ type: Object, default: {} }) pageConfig: Record<string, unknown>;
  @Prop({ type: Object, default: {} }) seo: Record<string, unknown>;
  @Prop({ type: Object, default: {} }) contact: Record<string, unknown>;
  @Prop({ type: Object, default: {} }) social: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
export type SiteDocument = HydratedDocument<Site>;
export const SiteSchema = SchemaFactory.createForClass(Site);
