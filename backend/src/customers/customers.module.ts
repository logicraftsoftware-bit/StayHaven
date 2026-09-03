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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') || '7d' },
      }),
    }),
    SitesModule,
  ],
  controllers: [CustomerAuthController, CustomerAccountController],
  providers: [CustomersService, CustomerActiveGuard],
})
export class CustomersModule {}
