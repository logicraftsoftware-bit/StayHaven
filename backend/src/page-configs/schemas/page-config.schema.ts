import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
@Schema({ collection: 'gw_page_configs', timestamps: true })
export class PageConfig {
  @Prop({ type: Types.ObjectId, ref: 'Site', required: true, index: true })
  siteId: Types.ObjectId;
  @Prop({ required: true, lowercase: true, trim: true }) pageSlug: string;
  @Prop({ default: true }) enabled: boolean;
  @Prop({ default: 'DEFAULT_HOME' }) preset: string;
  @Prop({ type: Object, required: true }) draft: Record<string, unknown>;
  @Prop({ type: Object, required: true }) published: Record<string, unknown>;
  @Prop() publishedAt?: Date;
  @Prop({ type: Types.ObjectId, ref: 'Admin' }) publishedBy?: Types.ObjectId;
}
export type PageConfigDocument = HydratedDocument<PageConfig>;
export const PageConfigSchema = SchemaFactory.createForClass(PageConfig);
PageConfigSchema.index({ siteId: 1, pageSlug: 1 }, { unique: true });
