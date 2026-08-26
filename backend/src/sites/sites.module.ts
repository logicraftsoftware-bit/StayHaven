import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Site, SiteSchema } from './schemas/site.schema';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Site.name, schema: SiteSchema }]),
    AuditLogsModule,
  ],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
