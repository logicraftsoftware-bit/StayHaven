import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { Property } from '../properties/schemas/property.schema';
import { PropertyType } from '../property-types/schemas/property-type.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Owner } from '../owners/schemas/owner.schema';
import { PropertyStatus } from '../common/enums/status.enum';
import {
  CreateBookingOrderDto,
  PaymentQueryDto,
  RequestWithdrawalDto,
  SaveBankAccountDto,
  VerifyPaymentDto,
  VerifyCashfreePaymentDto,
} from './dto/payment.dto';
import { Booking } from './schemas/booking.schema';
import {
  OwnerWallet,
  WalletTransaction,
  Withdrawal,
} from './schemas/wallet.schema';

type RazorpaySettings = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  accountNumber: string;
  liveMode: boolean;
  minimumWithdrawalAmount: number;
};
type CashfreeSettings = {
  appId: string;
  secretKey: string;
  webhookSecret: string;
  liveMode: boolean;
  activeGateway: string;
  payoutClientId: string;
  payoutClientSecret: string;
};

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    @InjectModel(Booking.name) private bookings: Model<Booking>,
    @InjectModel(OwnerWallet.name) private wallets: Model<OwnerWallet>,
    @InjectModel(WalletTransaction.name)
    private transactions: Model<WalletTransaction>,
    @InjectModel(Withdrawal.name) private withdrawals: Model<Withdrawal>,
    @InjectModel(Property.name) private properties: Model<Property>,
    @InjectModel(PropertyType.name) private propertyTypes: Model<PropertyType>,
    @InjectModel(Customer.name) private customers: Model<Customer>,
    @InjectModel(Owner.name) private owners: Model<Owner>,
    private settings: PlatformSettingsService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const run = () =>
      void this.settleEligible().catch((error: unknown) =>
        this.logger.error(
          'Scheduled settlement run failed',
          error instanceof Error ? error.stack : String(error),
        ),
      );
    const first = setTimeout(run, 30_000);
    first.unref();
    const timer = setInterval(run, 60 * 60 * 1000);
    timer.unref();
  }

  private money(value: number) {
    return Math.max(0, Math.round(value * 100));
  }
  private text(value: unknown, fallback = '') {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : fallback;
  }
  private id(prefix: string) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
  private secure(value: string, decode = false) {
    if (!value) return '';
    const key = createHash('sha256')
      .update(this.config.getOrThrow<string>('jwt.secret'))
      .digest();
    if (decode) {
      try {
        const [ivHex, tagHex, data] = value.split(':');
        const decipher = createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(ivHex, 'hex'),
        );
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return Buffer.concat([
          decipher.update(Buffer.from(data, 'base64')),
          decipher.final(),
        ]).toString('utf8');
      } catch {
        this.logger.warn('Ignored unreadable legacy owner bank details');
        return '';
      }
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${data.toString('base64')}`;
  }
  private async gateway(): Promise<RazorpaySettings> {
    const value = (await this.settings.razorpay(true)) as RazorpaySettings;
    if (!value.keyId || !value.keySecret)
      throw new ServiceUnavailableException(
        'Online payment is not configured yet',
      );
    return value;
  }
  private async cashfreeGateway(): Promise<CashfreeSettings> {
    const value = (await this.settings.cashfree(true)) as CashfreeSettings;
    if (!value.appId || !value.secretKey)
      throw new ServiceUnavailableException('Cashfree is not configured yet');
    return value;
  }
  private async cashfree(path: string, init: RequestInit = {}) {
    const gateway = await this.cashfreeGateway();
    const base = gateway.liveMode
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': gateway.appId,
        'x-client-secret': gateway.secretKey,
        ...(init.headers || {}),
      },
    });
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok)
      throw new BadGatewayException(
        this.text(payload.message, 'Cashfree request failed'),
      );
    return payload;
  }
  private async cashfreePayout(
    path: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    const gateway = await this.cashfreeGateway();
    if (!gateway.payoutClientId || !gateway.payoutClientSecret)
      throw new ServiceUnavailableException(
        'Cashfree Payouts credentials are not configured',
      );
    const base = gateway.liveMode
      ? 'https://api.cashfree.com/payout'
      : 'https://sandbox.cashfree.com/payout';
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2024-01-01',
        'x-client-id': gateway.payoutClientId,
        'x-client-secret': gateway.payoutClientSecret,
        'x-request-id': requestId,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok)
      throw new BadGatewayException(
        this.text(payload.message, 'Cashfree payout request failed'),
      );
    return payload;
  }
  private async razorpay(
    path: string,
    body: Record<string, unknown>,
    idempotencyKey?: string,
  ) {
    const gateway = await this.gateway();
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${gateway.keyId}:${gateway.keySecret}`).toString('base64')}`,
        ...(idempotencyKey ? { 'X-Payout-Idempotency': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok)
      throw new BadGatewayException(
        (payload.error as { description?: string } | undefined)?.description ||
          'Razorpay request failed',
      );
    return payload;
  }

  async createOrder(customerId: string, dto: CreateBookingOrderDto) {
    const [property, customer] = await Promise.all([
      this.properties
        .findOne({
          _id: dto.propertyId,
          status: PropertyStatus.APPROVED,
          active: { $ne: false },
        })
        .lean(),
      this.customers.findById(customerId).lean(),
    ]);
    if (!property) throw new NotFoundException('Live property not found');
    if (!customer) throw new NotFoundException('Customer not found');
    const room = (property.roomDetails || []).find(
      (entry, index) =>
        this.text(entry.id, this.text(entry._id, String(index))) === dto.roomId,
    );
    if (!room) throw new NotFoundException('Room not found');
    const checkIn = new Date(`${dto.checkIn}T00:00:00.000Z`);
    const checkOut = new Date(`${dto.checkOut}T00:00:00.000Z`);
    const nights = Math.round(
      (checkOut.valueOf() - checkIn.valueOf()) / 86400000,
    );
    if (
      !Number.isInteger(nights) ||
      nights < 1 ||
      nights > 60 ||
      checkIn < new Date(new Date().toISOString().slice(0, 10))
    )
      throw new BadRequestException(
        'Choose a valid future stay of 1 to 60 nights',
      );
    const baseRate = Number(room.baseRate || room.price || property.price || 0);
    if (baseRate <= 0)
      throw new BadRequestException('This room does not have a valid rate');
    const includedAdults =
      Math.max(1, Number(room.baseAdults || 2)) * dto.rooms;
    const extraAdultCount = Math.max(0, dto.adults - includedAdults);
    const roomAmount = this.money(baseRate * nights * dto.rooms);
    const extraGuestAmount = this.money(
      (extraAdultCount * Number(room.additionalAdultPrice || 0) +
        dto.children * Number(room.additionalChildPrice || 0)) *
        nights,
    );
    const taxAmount = this.money(Number(property.taxes || 0));
    const grossAmount = roomAmount + extraGuestAmount + taxAmount;
    const type = property.propertyTypeId
      ? await this.propertyTypes
          .findById(property.propertyTypeId)
          .select('+commissionPercent')
          .lean()
      : null;
    const commissionPercent = Number(type?.commissionPercent || 0);
    const commissionAmount = Math.round(
      (grossAmount * commissionPercent) / 100,
    );
    const bookingNumber = this.id('GH');
    const activeGateway = await this.settings.activePaymentGateway();
    const order =
      activeGateway === 'CASHFREE'
        ? await this.cashfree('/orders', {
            method: 'POST',
            body: JSON.stringify({
              order_id: bookingNumber,
              order_amount: grossAmount / 100,
              order_currency: 'INR',
              customer_details: {
                customer_id: customerId,
                customer_name: dto.guestName.trim(),
                customer_email: dto.guestEmail.toLowerCase(),
                customer_phone: dto.guestPhone.trim(),
              },
              order_meta: {
                notify_url:
                  'https://guwahatihomestay.com/api/v1/payments/cashfree/webhook',
              },
              order_note: `${property.displayName || property.name} booking`,
            }),
          })
        : await this.razorpay('/orders', {
            amount: grossAmount,
            currency: 'INR',
            receipt: bookingNumber,
            notes: { propertyId: String(property._id), customerId },
          });
    const gatewayOrderId = String(
      activeGateway === 'CASHFREE' ? order.order_id : order.id,
    );
    const booking = await this.bookings.create({
      customerId,
      ownerId: property.ownerId,
      propertyId: property._id,
      siteId: property.siteId,
      bookingNumber,
      propertyName: property.displayName || property.name,
      roomId: dto.roomId,
      roomName: this.text(room.name, 'Room'),
      guestName: dto.guestName.trim(),
      guestEmail: dto.guestEmail.toLowerCase(),
      guestPhone: dto.guestPhone.trim(),
      checkIn,
      checkOut,
      rooms: dto.rooms,
      adults: dto.adults,
      children: dto.children,
      nights,
      roomAmount,
      extraGuestAmount,
      taxAmount,
      grossAmount,
      commissionPercent,
      commissionAmount,
      ownerNetAmount: grossAmount - commissionAmount,
      paymentGateway: activeGateway,
      gatewayOrderId,
      ...(activeGateway === 'RAZORPAY'
        ? { razorpayOrderId: gatewayOrderId }
        : {}),
    });
    if (activeGateway === 'CASHFREE') {
      const cashfree = await this.cashfreeGateway();
      return {
        gateway: 'CASHFREE',
        bookingId: booking._id,
        bookingNumber,
        orderId: gatewayOrderId,
        paymentSessionId: order.payment_session_id,
        mode: cashfree.liveMode ? 'production' : 'sandbox',
        amount: grossAmount,
        currency: 'INR',
        propertyName: booking.propertyName,
      };
    }
    const gateway = await this.gateway();
    return {
      gateway: 'RAZORPAY',
      bookingId: booking._id,
      bookingNumber,
      razorpayOrderId: order.id,
      keyId: gateway.keyId,
      amount: grossAmount,
      currency: 'INR',
      propertyName: booking.propertyName,
      customer: {
        name: dto.guestName,
        email: dto.guestEmail,
        contact: dto.guestPhone,
      },
    };
  }

  async verifyPayment(customerId: string, dto: VerifyPaymentDto) {
    const booking = await this.bookings.findOne({
      customerId,
      razorpayOrderId: dto.razorpayOrderId,
    });
    if (!booking) throw new NotFoundException('Booking order not found');
    const gateway = await this.gateway();
    const expected = createHmac('sha256', gateway.keySecret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');
    const received = Buffer.from(dto.razorpaySignature);
    const expectedBuffer = Buffer.from(expected);
    if (
      received.length !== expectedBuffer.length ||
      !timingSafeEqual(received, expectedBuffer)
    )
      throw new BadRequestException('Payment signature is invalid');
    await this.captureBooking(
      booking.razorpayOrderId || booking.gatewayOrderId || '',
      dto.razorpayPaymentId,
    );
    return this.customerBooking(customerId, String(booking._id));
  }
  async verifyCashfreePayment(
    customerId: string,
    dto: VerifyCashfreePaymentDto,
  ) {
    const booking = await this.bookings.findOne({
      customerId,
      paymentGateway: 'CASHFREE',
      gatewayOrderId: dto.orderId,
    });
    if (!booking) throw new NotFoundException('Cashfree order not found');
    const order = await this.cashfree(
      `/orders/${encodeURIComponent(dto.orderId)}`,
    );
    if (order.order_status !== 'PAID')
      throw new BadRequestException('Cashfree has not confirmed this payment');
    await this.captureBooking(
      dto.orderId,
      this.text(order.cf_order_id, dto.orderId),
    );
    return this.customerBooking(customerId, String(booking._id));
  }
  private async captureBooking(orderId: string, paymentId: string) {
    const booking = await this.bookings.findOne({
      $or: [{ gatewayOrderId: orderId }, { razorpayOrderId: orderId }],
      paymentStatus: { $ne: 'PAID' },
    });
    if (!booking) return null;
    return this.bookings.findOneAndUpdate(
      { _id: booking._id, paymentStatus: { $ne: 'PAID' } },
      {
        $set: {
          gatewayPaymentId: paymentId,
          ...(booking.paymentGateway !== 'CASHFREE'
            ? { razorpayPaymentId: paymentId }
            : {}),
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          settlementStatus: 'ON_HOLD',
          paidAt: new Date(),
        },
      },
      { new: true },
    );
  }
  customerBookings(customerId: string) {
    return this.bookings
      .find({ customerId, paymentStatus: 'PAID' })
      .sort({ createdAt: -1 })
      .lean();
  }
  async customerBooking(customerId: string, id: string) {
    const value = await this.bookings.findOne({ _id: id, customerId }).lean();
    if (!value) throw new NotFoundException('Booking not found');
    return value;
  }

  async settleEligible(ownerId?: string) {
    const filter: Record<string, unknown> = {
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      settlementStatus: 'ON_HOLD',
      checkOut: { $lte: new Date() },
    };
    if (ownerId) filter.ownerId = new Types.ObjectId(ownerId);
    const eligible = await this.bookings.find(filter).limit(250);
    for (const booking of eligible) {
      const claimed = await this.bookings.findOneAndUpdate(
        { _id: booking._id, settlementStatus: 'ON_HOLD' },
        { $set: { settlementStatus: 'PROCESSING' } },
        { new: true },
      );
      if (!claimed) continue;
      try {
        const reference = `settlement:${booking._id.toString()}`;
        await this.transactions.updateOne(
          { reference },
          {
            $setOnInsert: {
              ownerId: booking.ownerId,
              propertyId: booking.propertyId,
              bookingId: booking._id,
              type: 'SETTLEMENT',
              direction: 'CREDIT',
              amount: booking.ownerNetAmount,
              reference,
              description: `${booking.bookingNumber} settlement after ${booking.nights} night stay`,
              status: 'COMPLETED',
              appliedToBalance: false,
            },
          },
          { upsert: true },
        );
        await this.wallets.updateOne(
          { ownerId: booking.ownerId },
          { $setOnInsert: { ownerId: booking.ownerId } },
          { upsert: true },
        );
        await this.wallets.findOneAndUpdate(
          {
            ownerId: booking.ownerId,
            appliedSettlementReferences: { $ne: reference },
          },
          {
            $inc: {
              availableBalance: booking.ownerNetAmount,
              totalSettled: booking.ownerNetAmount,
            },
            $addToSet: { appliedSettlementReferences: reference },
          },
        );
        await this.transactions.updateOne(
          { reference },
          { $set: { appliedToBalance: true } },
        );
        booking.settlementStatus = 'SETTLED';
        booking.settledAt = new Date();
        await booking.save();
      } catch {
        booking.settlementStatus = 'ON_HOLD';
        await booking.save();
      }
    }
    return eligible.length;
  }

  async ownerPayments(ownerId: string, query: PaymentQueryDto) {
    await this.settleEligible(ownerId);
    const filter: Record<string, unknown> = {
      ownerId: new Types.ObjectId(ownerId),
      paymentStatus: 'PAID',
    };
    if (query.propertyId)
      filter.propertyId = new Types.ObjectId(query.propertyId);
    if (query.search)
      filter.$or = [
        { bookingNumber: { $regex: query.search, $options: 'i' } },
        { guestName: { $regex: query.search, $options: 'i' } },
      ];
    if (query.from || query.to)
      filter.checkIn = {
        ...(query.from
          ? { $gte: new Date(`${query.from}T00:00:00.000Z`) }
          : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
      };
    const [bookings, wallet, transactions, withdrawals, paymentSettings] =
      await Promise.all([
        this.bookings.find(filter).sort({ checkIn: -1 }).lean(),
        this.wallets
          .findOne({ ownerId })
          .select('+bankAccountNumber +bankIfsc')
          .lean(),
        this.transactions
          .find({ ownerId })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        this.withdrawals
          .find({ ownerId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        this.settings.razorpay(false),
      ]);
    const held = bookings
      .filter((x) => x.settlementStatus !== 'SETTLED')
      .reduce((sum, x) => sum + x.ownerNetAmount, 0);
    const encryptedBank =
      (wallet as unknown as { bankAccountNumber?: string } | null)
        ?.bankAccountNumber || '';
    const bankAccount = this.secure(encryptedBank, true);
    return {
      wallet: {
        availableBalance: wallet?.availableBalance || 0,
        pendingBalance: held,
        totalSettled: wallet?.totalSettled || 0,
        totalWithdrawn: wallet?.totalWithdrawn || 0,
        beneficiaryName: wallet?.beneficiaryName || '',
        accountMask: bankAccount ? `••••${bankAccount.slice(-4)}` : '',
        bankConfigured: Boolean(wallet?.razorpayFundAccountId || bankAccount),
        minimumWithdrawalAmount: Number(
          (paymentSettings as { minimumWithdrawalAmount?: number })
            .minimumWithdrawalAmount || 1000,
        ),
      },
      bookings,
      transactions,
      withdrawals,
    };
  }

  async saveBank(ownerId: string, dto: SaveBankAccountDto) {
    await this.wallets.findOneAndUpdate(
      { ownerId },
      {
        $set: {
          beneficiaryName: dto.beneficiaryName.trim(),
          bankAccountNumber: this.secure(dto.accountNumber),
          bankIfsc: this.secure(dto.ifsc.toUpperCase()),
          razorpayFundAccountId: '',
          razorpayContactId: '',
        },
        $setOnInsert: { ownerId },
      },
      { upsert: true },
    );
    return {
      beneficiaryName: dto.beneficiaryName.trim(),
      accountMask: `••••${dto.accountNumber.slice(-4)}`,
      bankConfigured: true,
    };
  }

  async requestWithdrawal(ownerId: string, dto: RequestWithdrawalDto) {
    const activeGateway = await this.settings.activePaymentGateway();
    const gateway = (await this.settings.razorpay(true)) as RazorpaySettings;
    if (activeGateway === 'RAZORPAY' && !gateway.accountNumber)
      throw new ServiceUnavailableException(
        'RazorpayX payout account is not configured',
      );
    if (activeGateway === 'CASHFREE') {
      const cashfreeSettings = (await this.settings.cashfree(
        true,
      )) as CashfreeSettings;
      if (
        !cashfreeSettings.payoutClientId ||
        !cashfreeSettings.payoutClientSecret
      )
        throw new ServiceUnavailableException(
          'Cashfree Payouts credentials are not configured',
        );
    }
    if (dto.amount < gateway.minimumWithdrawalAmount)
      throw new BadRequestException(
        `Minimum withdrawal is ₹${gateway.minimumWithdrawalAmount}`,
      );
    const amount = this.money(dto.amount);
    const wallet = await this.wallets
      .findOneAndUpdate(
        {
          ownerId,
          availableBalance: { $gte: amount },
          bankAccountNumber: { $nin: ['', null] },
          bankIfsc: { $nin: ['', null] },
        },
        { $inc: { availableBalance: -amount } },
        { new: true },
      )
      .select('+bankAccountNumber +bankIfsc');
    if (!wallet)
      throw new BadRequestException(
        'Insufficient wallet balance or bank account is missing',
      );
    const withdrawalNumber = this.id('WD');
    const withdrawal = await this.withdrawals.create({
      ownerId,
      withdrawalNumber,
      amount,
      beneficiaryName: wallet.beneficiaryName,
      accountMask: `••••${this.secure(wallet.bankAccountNumber, true).slice(-4)}`,
      ifsc: this.secure(wallet.bankIfsc, true),
      status: 'PROCESSING',
      gateway: activeGateway,
    });
    let payoutAccepted = false;
    try {
      if (activeGateway === 'CASHFREE') {
        const owner = await this.owners.findById(ownerId).lean();
        const payout = await this.cashfreePayout(
          '/transfers',
          {
            transfer_id: withdrawalNumber.replaceAll('-', ''),
            transfer_amount: amount / 100,
            transfer_mode: 'imps',
            beneficiary_details: {
              beneficiary_id: `owner_${ownerId}`,
              beneficiary_name: wallet.beneficiaryName,
              beneficiary_instrument_details: {
                bank_account_number: this.secure(
                  wallet.bankAccountNumber,
                  true,
                ),
                bank_ifsc: this.secure(wallet.bankIfsc, true),
              },
              beneficiary_contact_details: {
                beneficiary_email: owner?.email,
                beneficiary_phone: owner?.phone,
                beneficiary_country_code: '+91',
              },
            },
            transfer_remarks: 'StayHaven owner withdrawal',
          },
          withdrawalNumber,
        );
        payoutAccepted = true;
        withdrawal.gatewayPayoutId = this.text(
          payout.cf_transfer_id,
          withdrawalNumber,
        );
        withdrawal.utr = this.text(payout.transfer_utr);
        withdrawal.status = this.text(payout.status, 'RECEIVED').toUpperCase();
        await withdrawal.save();
        await this.transactions.updateOne(
          { reference: `withdrawal:${withdrawal._id.toString()}` },
          {
            $setOnInsert: {
              ownerId,
              withdrawalId: withdrawal._id,
              type: 'WITHDRAWAL',
              direction: 'DEBIT',
              amount,
              reference: `withdrawal:${withdrawal._id.toString()}`,
              description: `Withdrawal ${withdrawalNumber}`,
              status: 'PENDING',
              appliedToBalance: true,
            },
          },
          { upsert: true },
        );
        return withdrawal;
      }
      let contactId = wallet.razorpayContactId;
      let fundAccountId = wallet.razorpayFundAccountId;
      if (!contactId) {
        const owner = await this.owners.findById(ownerId).lean();
        const contact = await this.razorpay('/contacts', {
          name: wallet.beneficiaryName,
          email: owner?.email,
          contact: owner?.phone,
          type: 'vendor',
          reference_id: `owner_${ownerId}`,
        });
        contactId = String(contact.id);
      }
      if (!fundAccountId) {
        const fund = await this.razorpay('/fund_accounts', {
          contact_id: contactId,
          account_type: 'bank_account',
          bank_account: {
            name: wallet.beneficiaryName,
            ifsc: this.secure(wallet.bankIfsc, true),
            account_number: this.secure(wallet.bankAccountNumber, true),
          },
        });
        fundAccountId = String(fund.id);
        await this.wallets.updateOne(
          { _id: wallet._id },
          {
            razorpayContactId: contactId,
            razorpayFundAccountId: fundAccountId,
          },
        );
      }
      const payout = await this.razorpay(
        '/payouts',
        {
          account_number: gateway.accountNumber,
          fund_account_id: fundAccountId,
          amount,
          currency: 'INR',
          mode: 'IMPS',
          purpose: 'payout',
          queue_if_low_balance: true,
          reference_id: withdrawalNumber,
          narration: 'StayHaven payout',
        },
        withdrawalNumber,
      );
      payoutAccepted = true;
      withdrawal.razorpayPayoutId = String(payout.id);
      withdrawal.gatewayPayoutId = String(payout.id);
      withdrawal.status = this.text(payout.status, 'queued').toUpperCase();
      await withdrawal.save();
      await this.transactions.updateOne(
        { reference: `withdrawal:${withdrawal._id.toString()}` },
        {
          $setOnInsert: {
            ownerId,
            withdrawalId: withdrawal._id,
            type: 'WITHDRAWAL',
            direction: 'DEBIT',
            amount,
            reference: `withdrawal:${withdrawal._id.toString()}`,
            description: `Withdrawal ${withdrawalNumber}`,
            status: 'PENDING',
            appliedToBalance: true,
          },
        },
        { upsert: true },
      );
      return withdrawal;
    } catch (error) {
      if (!payoutAccepted) {
        await this.wallets.updateOne(
          { ownerId },
          { $inc: { availableBalance: amount } },
        );
        withdrawal.status = 'FAILED';
        withdrawal.failureReason =
          error instanceof Error ? error.message : 'Payout failed';
        await withdrawal.save();
      }
      throw error;
    }
  }

  async webhook(raw: Buffer, signature: string) {
    const gateway = (await this.settings.razorpay(true)) as RazorpaySettings;
    if (!gateway.webhookSecret)
      throw new ServiceUnavailableException('Webhook secret is not configured');
    const expected = createHmac('sha256', gateway.webhookSecret)
      .update(raw)
      .digest('hex');
    const a = Buffer.from(signature || '');
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new BadRequestException('Invalid webhook signature');
    const event = JSON.parse(raw.toString('utf8')) as {
      event?: string;
      payload?: Record<string, { entity?: Record<string, unknown> }>;
    };
    if (event.event === 'payment.captured') {
      const entity = event.payload?.payment?.entity;
      if (entity)
        await this.captureBooking(String(entity.order_id), String(entity.id));
    }
    if (event.event?.startsWith('payout.')) {
      const entity = event.payload?.payout?.entity;
      if (entity?.id)
        await this.updatePayout(
          this.text(entity.id),
          this.text(entity.status),
          this.text(entity.utr),
          String((entity.failure_reason as string) || ''),
        );
    }
    return { received: true };
  }
  async cashfreeWebhook(raw: Buffer, signature: string, timestamp: string) {
    const gateway = (await this.settings.cashfree(true)) as CashfreeSettings;
    const secret = gateway.secretKey;
    if (!secret)
      throw new ServiceUnavailableException(
        'Cashfree webhook is not configured',
      );
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}${raw.toString('utf8')}`)
      .digest('base64');
    const a = Buffer.from(signature || '');
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new BadRequestException('Invalid Cashfree webhook signature');
    const event = JSON.parse(raw.toString('utf8')) as {
      type?: string;
      data?: {
        order?: { order_id?: string };
        payment?: { cf_payment_id?: string | number; payment_status?: string };
      };
    };
    if (
      event.type === 'PAYMENT_SUCCESS_WEBHOOK' &&
      event.data?.payment?.payment_status === 'SUCCESS' &&
      event.data.order?.order_id
    )
      await this.captureBooking(
        event.data.order.order_id,
        String(event.data.payment.cf_payment_id || ''),
      );
    return { received: true };
  }
  private async updatePayout(
    id: string,
    status: string,
    utr: string,
    failure: string,
  ) {
    const withdrawal = await this.withdrawals.findOne({ razorpayPayoutId: id });
    if (!withdrawal) return;
    const normalized = status.toUpperCase();
    if (['PROCESSED', 'FAILED', 'REVERSED'].includes(withdrawal.status)) return;
    withdrawal.status = normalized;
    withdrawal.utr = utr;
    withdrawal.failureReason = failure;
    withdrawal.processedAt = new Date();
    await withdrawal.save();
    const transaction = await this.transactions.findOne({
      withdrawalId: withdrawal._id,
    });
    if (normalized === 'PROCESSED') {
      await this.wallets.updateOne(
        { ownerId: withdrawal.ownerId },
        { $inc: { totalWithdrawn: withdrawal.amount } },
      );
      if (transaction) {
        transaction.status = 'COMPLETED';
        await transaction.save();
      }
    }
    if (['FAILED', 'REVERSED'].includes(normalized)) {
      await this.wallets.updateOne(
        { ownerId: withdrawal.ownerId },
        { $inc: { availableBalance: withdrawal.amount } },
      );
      if (transaction) {
        transaction.status = 'FAILED';
        await transaction.save();
      }
    }
  }
}
