import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Property, PropertySchema } from './schemas/property.schema';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { SitesModule } from '../sites/sites.module';
import { PublicPropertiesController } from './public-properties.controller';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
    ]),
    AuditLogsModule,
    SitesModule,
  ],
  controllers: [PropertiesController, PublicPropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
