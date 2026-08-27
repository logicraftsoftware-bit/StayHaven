import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { AdminsModule } from './admins/admins.module';
import { SitesModule } from './sites/sites.module';
import { PropertiesModule } from './properties/properties.module';
import { OwnersModule } from './owners/owners.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { HealthController } from './health.controller';
import { DocsController } from './docs.controller';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        uri: c.getOrThrow<string>('mongodbUri'),
        dbName: 'guwahati_homestay',
      }),
    }),
    AuditLogsModule,
    AdminsModule,
    AuthModule,
    SitesModule,
    PropertiesModule,
    OwnersModule,
  ],
  controllers: [HealthController, DocsController],
})
export class AppModule {}
