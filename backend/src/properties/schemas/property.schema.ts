import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PropertyStatus } from '../../common/enums/status.enum';
@Schema({ timestamps: true })
export class Property {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  siteId: Types.ObjectId;
  @Prop({ required: true }) name: string;
  @Prop({ required: true, index: true }) slug: string;
  @Prop({ required: true }) propertyType: string;
  @Prop() description?: string;
  @Prop({ required: true }) address: string;
  @Prop({ required: true }) city: string;
  @Prop({ required: true }) state: string;
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
  createdAt: Date;
  updatedAt: Date;
}
export type PropertyDocument = HydratedDocument<Property>;
export const PropertySchema = SchemaFactory.createForClass(Property);
PropertySchema.index({ siteId: 1, status: 1, createdAt: -1 });
PropertySchema.index({ ownerId: 1, status: 1 });
