import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DashboardController } from './dashboard.controller';
import { OwnersModule } from '../owners/owners.module';
import { PropertiesModule } from '../properties/properties.module';
import { SitesModule } from '../sites/sites.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    AuditLogsModule,
    OwnersModule,
    PropertiesModule,
    SitesModule,
  ],
  providers: [AdminsService],
  controllers: [AdminsController, DashboardController],
  exports: [AdminsService],
})
export class AdminsModule {}
