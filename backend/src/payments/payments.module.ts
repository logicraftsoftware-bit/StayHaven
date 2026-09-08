import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module';
import { OwnersModule } from '../owners/owners.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import {
  Property,
  PropertySchema,
} from '../properties/schemas/property.schema';
import {
  PropertyType,
  PropertyTypeSchema,
} from '../property-types/schemas/property-type.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Owner, OwnerSchema } from '../owners/schemas/owner.schema';
import {
  CustomerPaymentsController,
  OwnerPaymentsController,
  RazorpayWebhookController,
} from './payments.controller';
import { PaymentsService } from './payments.service';
import { Booking, BookingSchema } from './schemas/booking.schema';
import {
  OwnerWallet,
  OwnerWalletSchema,
  WalletTransaction,
  WalletTransactionSchema,
  Withdrawal,
  WithdrawalSchema,
} from './schemas/wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: OwnerWallet.name, schema: OwnerWalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Withdrawal.name, schema: WithdrawalSchema },
      { name: Property.name, schema: PropertySchema },
      { name: PropertyType.name, schema: PropertyTypeSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Owner.name, schema: OwnerSchema },
    ]),
    PlatformSettingsModule,
    OwnersModule,
    CustomersModule,
  ],
  controllers: [
    CustomerPaymentsController,
    OwnerPaymentsController,
    RazorpayWebhookController,
  ],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
