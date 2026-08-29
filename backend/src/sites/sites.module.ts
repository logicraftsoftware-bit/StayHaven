import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Site, SiteSchema } from './schemas/site.schema';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { PublicSitesController } from './public-sites.controller';
import { SiteDomain, SiteDomainSchema } from './schemas/site-domain.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Site.name, schema: SiteSchema },
      { name: SiteDomain.name, schema: SiteDomainSchema },
    ]),
    AuditLogsModule,
  ],
  controllers: [SitesController, PublicSitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
