import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Owner, OwnerSchema } from './schemas/owner.schema';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
import { AuthModule } from '../auth/auth.module';
import { SitesModule } from '../sites/sites.module';
import {
  OwnerAccountController,
  OwnerAuthController,
} from './owner-account.controller';
import { OwnerStatusGuard } from './owner-status.guard';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Owner.name, schema: OwnerSchema }]),
    AuditLogsModule,
    AuthModule,
    SitesModule,
  ],
  controllers: [OwnersController, OwnerAuthController, OwnerAccountController],
  providers: [OwnersService, OwnerStatusGuard],
  exports: [OwnersService, OwnerStatusGuard],
})
export class OwnersModule {}
