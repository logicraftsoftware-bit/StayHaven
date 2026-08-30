import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SitesModule } from '../sites/sites.module';
import { PageConfigsController } from './page-configs.controller';
import { PageConfigsService } from './page-configs.service';
import { PublicPageConfigsController } from './public-page-configs.controller';
import { PageConfig, PageConfigSchema } from './schemas/page-config.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageConfig.name, schema: PageConfigSchema },
    ]),
    SitesModule,
    AuditLogsModule,
  ],
  controllers: [PageConfigsController, PublicPageConfigsController],
  providers: [PageConfigsService],
  exports: [PageConfigsService],
})
export class PageConfigsModule {}
