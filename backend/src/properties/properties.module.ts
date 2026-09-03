import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Property, PropertySchema } from './schemas/property.schema';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { SitesModule } from '../sites/sites.module';
import { PublicPropertiesController } from './public-properties.controller';
import { OwnerPropertiesController } from './owner-properties.controller';
import { OwnersModule } from '../owners/owners.module';
import { PropertyTypesModule } from '../property-types/property-types.module';
import {
  RoomInventory,
  RoomInventorySchema,
} from './schemas/room-inventory.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: RoomInventory.name, schema: RoomInventorySchema },
    ]),
    AuditLogsModule,
    SitesModule,
    OwnersModule,
    PropertyTypesModule,
  ],
  controllers: [
    PropertiesController,
    PublicPropertiesController,
    OwnerPropertiesController,
  ],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
