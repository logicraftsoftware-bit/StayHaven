import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PropertyStatus } from '../../common/enums/status.enum';
@Schema({ collection: 'gw_properties', timestamps: true })
export class Property {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  siteId: Types.ObjectId;
  @Prop({ default: '' }) name: string;
  @Prop({ required: true, index: true }) slug: string;
  @Prop({ required: true }) propertyType: string;
  @Prop({ type: Types.ObjectId, ref: 'PropertyType', index: true })
  propertyTypeId?: Types.ObjectId;
  @Prop() displayName?: string;
  @Prop() description?: string;
  @Prop({ default: '' }) address: string;
  @Prop({ default: '' }) city: string;
  @Prop({ default: '' }) state: string;
  @Prop({ default: 'India' }) country: string;
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  })
  location: { type: 'Point'; coordinates: [number, number] };
  @Prop({
    type: String,
    enum: PropertyStatus,
    default: PropertyStatus.DRAFT,
    index: true,
  })
  status: PropertyStatus;
  @Prop() reviewReason?: string;
  @Prop({ default: true, index: true }) active: boolean;
  @Prop({ min: 0 }) price?: number;
  @Prop({ min: 0 }) taxes?: number;
  @Prop({ min: 1 }) rooms?: number;
  @Prop({ min: 1 }) maxGuests?: number;
  @Prop({ type: [String], default: [] }) amenities: string[];
  @Prop({ type: Object, default: {} }) basicInfo: Record<string, unknown>;
  @Prop({ type: Object, default: {} }) locationDetails: Record<string, unknown>;
  @Prop({ type: [Object], default: [] }) roomDetails: Record<string, unknown>[];
  @Prop({ type: [Object], default: [] }) media: Record<string, unknown>[];
  @Prop({ type: [Object], default: [] }) mealPlans: Record<string, unknown>[];
  @Prop({ type: Object, default: {} }) policies: Record<string, unknown>;
  @Prop({ type: String, default: '', select: false })
  financeLegal: string;
  @Prop({ type: [Object], default: [], select: false })
  documents: Record<string, unknown>[];
  @Prop({ type: Object, default: {} }) seo: Record<string, unknown>;
  @Prop({ type: [Object], default: [] }) reviewHistory: Record<
    string,
    unknown
  >[];
  @Prop({ default: 0, min: 0, max: 100 }) completeness: number;
  createdAt: Date;
  updatedAt: Date;
}
export type PropertyDocument = HydratedDocument<Property>;
export const PropertySchema = SchemaFactory.createForClass(Property);
PropertySchema.index({ siteId: 1, status: 1, createdAt: -1 });
PropertySchema.index({ ownerId: 1, status: 1 });
PropertySchema.index({ ownerId: 1, siteId: 1, createdAt: -1 });
PropertySchema.index({ siteId: 1, slug: 1 }, { unique: true });
