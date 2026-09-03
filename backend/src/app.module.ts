import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { setServers } from 'node:dns';
import configuration from './config/configuration';
import { validateEnvironment } from './config/validate-environment';
import { AuthModule } from './auth/auth.module';
import { AdminsModule } from './admins/admins.module';
import { SitesModule } from './sites/sites.module';
import { PropertiesModule } from './properties/properties.module';
import { OwnersModule } from './owners/owners.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PageConfigsModule } from './page-configs/page-configs.module';
import { HealthController } from './health.controller';
import { MediaModule } from './media/media.module';
import { PropertyTypesModule } from './property-types/property-types.module';
import { OwnerOperationsModule } from './owner-operations/owner-operations.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
import { CustomersModule } from './customers/customers.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => {
        const dnsServers = c.get<string[]>('dnsServers') || [];
        if (dnsServers.length) setServers(dnsServers);
        return {
          uri: c.getOrThrow<string>('mongodbUri'),
          dbName: 'guwahati_homestay',
        };
      },
    }),
    AuditLogsModule,
    PageConfigsModule,
    AdminsModule,
    AuthModule,
    SitesModule,
    PropertiesModule,
    OwnersModule,
    MediaModule,
    PropertyTypesModule,
    OwnerOperationsModule,
    PlatformSettingsModule,
    CustomersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
