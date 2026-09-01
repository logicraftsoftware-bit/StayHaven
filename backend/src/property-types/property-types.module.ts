import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyTypesController } from './property-types.controller';
import { PropertyTypesService } from './property-types.service';
import {
  PropertyType,
  PropertyTypeSchema,
} from './schemas/property-type.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PropertyType.name, schema: PropertyTypeSchema },
    ]),
  ],
  controllers: [PropertyTypesController],
  providers: [PropertyTypesService],
  exports: [PropertyTypesService],
})
export class PropertyTypesModule {}
