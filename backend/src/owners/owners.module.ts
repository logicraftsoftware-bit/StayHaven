import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Owner, OwnerSchema } from './schemas/owner.schema';
import { OwnersController } from './owners.controller';
import { OwnersService } from './owners.service';
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
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') || '7d' },
      }),
    }),
    SitesModule,
  ],
  controllers: [OwnersController, OwnerAuthController, OwnerAccountController],
  providers: [OwnersService, OwnerStatusGuard],
  exports: [OwnersService, OwnerStatusGuard],
})
export class OwnersModule {}
