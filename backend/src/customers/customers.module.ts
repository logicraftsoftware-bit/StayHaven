import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { SitesModule } from '../sites/sites.module';
import {
  CustomerAccountController,
  CustomerAuthController,
} from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { CustomerActiveGuard } from './customer-active.guard';
import { CustomerOtp, CustomerOtpSchema } from './schemas/customer-otp.schema';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: CustomerOtp.name, schema: CustomerOtpSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') || '7d' },
      }),
    }),
    SitesModule,
    PlatformSettingsModule,
    MediaModule,
  ],
  controllers: [CustomerAuthController, CustomerAccountController],
  providers: [CustomersService, CustomerActiveGuard],
})
export class CustomersModule {}
