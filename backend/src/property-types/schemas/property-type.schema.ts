import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'gw_property_types', timestamps: true })
export class PropertyType {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;
  @Prop() image?: string;
  @Prop({ default: '' }) description: string;
  @Prop({ required: true, min: 0, max: 100, select: false })
  commissionPercent: number;
  @Prop({ enum: ['active', 'inactive'], default: 'active', index: true })
  status: string;
  @Prop({ default: 0 }) sortOrder: number;
}
export type PropertyTypeDocument = HydratedDocument<PropertyType>;
export const PropertyTypeSchema = SchemaFactory.createForClass(PropertyType);
PropertyTypeSchema.index({ status: 1, sortOrder: 1, name: 1 });
