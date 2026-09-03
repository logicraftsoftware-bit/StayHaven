import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'gw_room_inventory', timestamps: true })
export class RoomInventory {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  propertyId: Types.ObjectId;
  @Prop({ required: true }) roomId: string;
  @Prop({ required: true }) date: Date;
  @Prop({ required: true, min: 0 }) available: number;
  @Prop({ default: 0, min: 0 }) blocked: number;
  @Prop({ required: true, min: 0 }) rate: number;
  @Prop({ min: 1 }) minimumStay?: number;
  @Prop({ min: 1 }) maximumStay?: number;
}
export const RoomInventorySchema = SchemaFactory.createForClass(RoomInventory);
RoomInventorySchema.index(
  { propertyId: 1, roomId: 1, date: 1 },
  { unique: true },
);
