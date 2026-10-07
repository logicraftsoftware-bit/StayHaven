import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { HydratedDocument, Model, Types } from 'mongoose';
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
import { PropertiesService } from '../properties/properties.service';
import { PropertyType } from '../property-types/schemas/property-type.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Owner } from '../owners/schemas/owner.schema';
import { PropertyStatus } from '../common/enums/status.enum';
import { Role } from '../common/enums/role.enum';
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
    private propertyAvailability: PropertiesService,
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
  private validateBookingGuests(dto: CreateBookingOrderDto, room: { maxAdults?: number; maxChildren?: number }) {
    if (dto.adults + dto.children < dto.rooms)
      throw new BadRequestException('At least one guest is required for each room');
    if (room.maxAdults && dto.adults > room.maxAdults * dto.rooms)
      throw new BadRequestException('Too many adults for the selected rooms');
    if (room.maxChildren !== undefined && dto.children > room.maxChildren * dto.rooms)
      throw new BadRequestException('Too many children for the selected rooms');
    if (dto.guestDetails) {
      if (dto.guestDetails.length !== dto.adults + dto.children - 1)
        throw new BadRequestException('Enter the name and age of every additional guest');
      dto.guestDetails.forEach((guest, index) => {
        if (!guest.name?.trim() || !Number.isInteger(guest.age) || (index < dto.adults - 1 ? guest.age < 18 : guest.age > 17))
          throw new BadRequestException('Additional guest names and ages do not match the adult and child counts');
      });
    }
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

  async createPayAtHotelBooking(
    customerId: string,
    siteId: string,
    dto: CreateBookingOrderDto,
  ) {
    const [property, customer] = await Promise.all([
      this.properties
        .findOne({
          _id: dto.propertyId,
          siteId: new Types.ObjectId(siteId),
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
    this.validateBookingGuests(dto, room);
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
    const availability = await this.propertyAvailability.publicAvailability(
      String(property.siteId),
      property.slug,
      {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guests: dto.adults + dto.children,
      },
    );
    const roomAvailability = availability.rooms.find(
      (entry) => entry.roomId === dto.roomId,
    );
    if (
      roomAvailability?.status !== 'AVAILABLE' ||
      roomAvailability.availableInventory < dto.rooms
    )
      throw new BadRequestException(
        'The selected room is not available for these dates. Please choose another stay.',
      );
    const baseRate = Number(room.baseRate || room.price || property.price || 0);
    if (baseRate <= 0)
      throw new BadRequestException('This room does not have a valid rate');
    const includedAdults =
      Math.max(1, Number(room.baseAdults || 2)) * dto.rooms;
    const extraAdults = Math.max(0, dto.adults - includedAdults);
    const roomAmount = this.money(
      (roomAvailability.totalRate || baseRate * nights) * dto.rooms,
    );
    const extraGuestAmount = this.money(
      (extraAdults * Number(room.additionalAdultPrice || 0) +
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
    const booking = await this.bookings.create({
      customerId,
      ownerId: property.ownerId,
      propertyId: property._id,
      siteId: property.siteId,
      bookingNumber: this.id('GH'),
      propertyName: property.displayName || property.name,
      roomId: dto.roomId,
      roomName: this.text(room.name, 'Room'),
      guestName: dto.guestName.trim(),
      guestEmail: dto.guestEmail.toLowerCase(),
      guestPhone: dto.guestPhone.trim(),
      guestDetails: dto.guestDetails || [],
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
      status: 'CONFIRMED',
      paymentStatus: 'PAY_AT_HOTEL',
      settlementStatus: 'NOT_APPLICABLE',
      paymentGateway: 'PAY_AT_HOTEL',
    });
    return {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      amountDueAtProperty: grossAmount,
    };
  }

  async payExistingBooking(customerId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid booking');
    const booking = await this.bookings.findOne({ _id: id, customerId, status: 'CONFIRMED' });
    if (!booking) throw new NotFoundException('Confirmed booking not found');
    if (booking.checkIn <= new Date()) throw new BadRequestException('Online payment is unavailable after check-in');
    if (booking.paymentStatus === 'PAID') throw new BadRequestException('This booking is already paid');
    if (!['PAY_AT_HOTEL', 'PAYMENT_PENDING'].includes(booking.paymentStatus))
      throw new BadRequestException('This booking cannot be paid online');
    if (booking.paymentStatus === 'PAYMENT_PENDING' && booking.gatewayOrderId) {
      if (booking.paymentGateway === 'CASHFREE') {
        const cashfree = await this.cashfreeGateway();
        return { gateway: 'CASHFREE', bookingId: booking._id, bookingNumber: booking.bookingNumber, orderId: booking.gatewayOrderId, paymentSessionId: booking.paymentSessionId, mode: cashfree.liveMode ? 'production' : 'sandbox', amount: booking.grossAmount, currency: 'INR', propertyName: booking.propertyName };
      }
      const gateway = await this.gateway();
      return { gateway: 'RAZORPAY', bookingId: booking._id, bookingNumber: booking.bookingNumber, razorpayOrderId: booking.gatewayOrderId, keyId: gateway.keyId, amount: booking.grossAmount, currency: 'INR', propertyName: booking.propertyName, customer: { name: booking.guestName, email: booking.guestEmail, contact: booking.guestPhone } };
    }
    const activeGateway = await this.settings.activePaymentGateway();
    const order = activeGateway === 'CASHFREE'
      ? await this.cashfree('/orders', { method: 'POST', body: JSON.stringify({
          order_id: booking.bookingNumber, order_amount: booking.grossAmount / 100, order_currency: 'INR',
          customer_details: { customer_id: customerId, customer_name: booking.guestName, customer_email: booking.guestEmail, customer_phone: booking.guestPhone },
          order_meta: { notify_url: 'https://guwahatihomestay.com/api/v1/payments/cashfree/webhook' },
          order_note: `${booking.propertyName} booking`,
        }) })
      : await this.razorpay('/orders', { amount: booking.grossAmount, currency: 'INR', receipt: booking.bookingNumber, notes: { bookingId: String(booking._id), customerId } });
    const gatewayOrderId = String(activeGateway === 'CASHFREE' ? order.order_id : order.id);
    const updated = await this.bookings.findOneAndUpdate(
      { _id: booking._id, status: 'CONFIRMED', paymentStatus: 'PAY_AT_HOTEL' },
      { $set: { paymentStatus: 'PAYMENT_PENDING', paymentGateway: activeGateway, gatewayOrderId,
        paymentSessionId: activeGateway === 'CASHFREE' ? String(order.payment_session_id || '') : undefined,
        ...(activeGateway === 'RAZORPAY' ? { razorpayOrderId: gatewayOrderId } : {}) } },
      { new: true },
    );
    if (!updated) throw new BadRequestException('The booking payment state changed. Refresh My trips.');
    if (activeGateway === 'CASHFREE') {
      const cashfree = await this.cashfreeGateway();
      return { gateway: 'CASHFREE', bookingId: booking._id, bookingNumber: booking.bookingNumber, orderId: gatewayOrderId, paymentSessionId: order.payment_session_id, mode: cashfree.liveMode ? 'production' : 'sandbox', amount: booking.grossAmount, currency: 'INR', propertyName: booking.propertyName };
    }
    const gateway = await this.gateway();
    return { gateway: 'RAZORPAY', bookingId: booking._id, bookingNumber: booking.bookingNumber, razorpayOrderId: gatewayOrderId, keyId: gateway.keyId, amount: booking.grossAmount, currency: 'INR', propertyName: booking.propertyName, customer: { name: booking.guestName, email: booking.guestEmail, contact: booking.guestPhone } };
  }

  async createOrder(customerId: string, siteId: string, dto: CreateBookingOrderDto) {
    const [property, customer] = await Promise.all([
      this.properties
        .findOne({
          _id: dto.propertyId,
          siteId: new Types.ObjectId(siteId),
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
    this.validateBookingGuests(dto, room);
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
    const availability = await this.propertyAvailability.publicAvailability(
      String(property.siteId),
      property.slug,
      {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guests: dto.adults + dto.children,
      },
    );
    const roomAvailability = availability.rooms.find(
      (entry) => entry.roomId === dto.roomId,
    );
    if (
      roomAvailability?.status !== 'AVAILABLE' ||
      roomAvailability.availableInventory < dto.rooms
    )
      throw new BadRequestException(
        'The selected room is not available for these dates. Please choose another stay.',
      );
    const baseRate = Number(room.baseRate || room.price || property.price || 0);
    if (baseRate <= 0)
      throw new BadRequestException('This room does not have a valid rate');
    const includedAdults =
      Math.max(1, Number(room.baseAdults || 2)) * dto.rooms;
    const extraAdultCount = Math.max(0, dto.adults - includedAdults);
    const roomAmount = this.money(
      (roomAvailability.totalRate || baseRate * nights) * dto.rooms,
    );
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
      guestDetails: dto.guestDetails || [],
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
      status: { $in: ['PAYMENT_PENDING', 'CONFIRMED'] },
      paymentStatus: { $in: ['PENDING', 'PAYMENT_PENDING'] },
    });
    if (!booking) return null;
    return this.bookings.findOneAndUpdate(
      { _id: booking._id, status: { $in: ['PAYMENT_PENDING', 'CONFIRMED'] }, paymentStatus: { $in: ['PENDING', 'PAYMENT_PENDING'] } },
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
  async customerBookings(customerId: string) {
    const bookings = await this.bookings.find({ customerId, status: { $ne: 'PAYMENT_PENDING' } }).sort({ createdAt: -1 }).lean();
    const ids = [...new Set(bookings.map((booking) => String(booking.propertyId)))];
    const properties = ids.length ? await this.properties.find({ _id: { $in: ids } }).select('slug address city state basicInfo locationDetails').lean() : [];
    const byId = new Map(properties.map((property) => [String(property._id), property]));
    return bookings.map((booking) => {
      const property = byId.get(String(booking.propertyId));
      return { ...booking,
        propertySlug: property?.slug || '',
        propertyAddress: [property?.address, property?.city, property?.state].filter(Boolean).join(', '),
        propertyPhone: this.text(property?.basicInfo?.phone),
        propertyMapUrl: this.text(property?.locationDetails?.mapUrl),
      };
    });
  }
  async ownerBookings(ownerId: string, propertyId: string) {
    const property = await this.properties.exists({
      _id: new Types.ObjectId(propertyId),
      ownerId: new Types.ObjectId(ownerId),
    });
    if (!property) throw new NotFoundException('Property not found');
    return this.bookings
      .find({
        ownerId: new Types.ObjectId(ownerId),
        propertyId: new Types.ObjectId(propertyId),
        status: { $ne: 'PAYMENT_PENDING' },
      })
      .sort({ checkIn: -1 })
      .lean();
  }
  async cancelOwnerBooking(
    actor: { sub: string; role: Role; ownerId?: string; propertyIds?: string[]; permissions?: string[] },
    id: string,
    reason: string,
  ) {
    if (actor.role !== Role.HOTEL_OWNER) throw new ForbiddenException('Only the property owner can cancel reservations');
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid booking');
    const booking = await this.bookings.findById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    if (String(booking.ownerId) !== actor.sub)
      throw new ForbiddenException('Booking access denied');
    return this.cancelReservation(booking, reason);
  }
  async cancelCustomerBooking(customerId: string, id: string, reason: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid booking');
    const booking = await this.bookings.findOne({ _id: id, customerId });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.cancelReservation(booking, reason);
  }
  private async cancelReservation(booking: HydratedDocument<Booking>, reason: string) {
    if (booking.status === 'CANCELLED') throw new BadRequestException('This booking is already cancelled');
    if (!['CONFIRMED', 'REFUND_REQUESTING'].includes(booking.status)) throw new BadRequestException('This booking cannot be cancelled now');
    if (booking.checkIn <= new Date()) throw new BadRequestException('Contact support to cancel a stay after check-in');
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) throw new BadRequestException('Enter a cancellation reason of at least 5 characters');
    if (booking.paymentStatus === 'PAYMENT_PENDING') throw new BadRequestException('A guest payment is in progress. Cancel after it completes or contact support.');
    if (booking.paymentStatus === 'PAY_AT_HOTEL') {
      const cancelled = await this.bookings.findOneAndUpdate(
        { _id: booking._id, status: 'CONFIRMED', paymentStatus: 'PAY_AT_HOTEL' },
        { $set: { status: 'CANCELLED', cancelReason: trimmedReason, cancelledAt: new Date() } },
        { new: true },
      );
      if (!cancelled) throw new BadRequestException('The booking changed. Refresh and try again.');
      return cancelled;
    }
    if (booking.paymentStatus !== 'PAID' || booking.settlementStatus !== 'ON_HOLD')
      throw new BadRequestException('This payment requires support-assisted cancellation');
    const claimed = booking.status === 'REFUND_REQUESTING' ? booking : await this.bookings.findOneAndUpdate(
      { _id: booking._id, status: 'CONFIRMED', paymentStatus: 'PAID', settlementStatus: 'ON_HOLD' },
      { $set: { status: 'REFUND_REQUESTING', cancelReason: trimmedReason, refundStatus: 'REQUESTING', refundRequestedAt: new Date() } },
      { new: true },
    );
    if (!claimed) throw new BadRequestException('The booking changed. Refresh and try again.');
    let accepted = false;
    try {
      let refund: Record<string, unknown>;
      const stableRefundId = `REFUND_${String(booking._id)}`;
      if (booking.paymentGateway === 'CASHFREE') {
        if (!booking.gatewayOrderId) throw new BadRequestException('Cashfree order reference is missing');
        refund = await this.cashfree(`/orders/${encodeURIComponent(booking.gatewayOrderId)}/refunds`, {
          method: 'POST',
          headers: { 'x-idempotency-key': stableRefundId },
          body: JSON.stringify({ refund_amount: booking.grossAmount / 100, refund_id: stableRefundId, refund_note: claimed.cancelReason || trimmedReason, refund_speed: 'STANDARD' }),
        });
      } else if (booking.paymentGateway === 'RAZORPAY') {
        const paymentId = booking.razorpayPaymentId || booking.gatewayPaymentId;
        if (!paymentId) throw new BadRequestException('Razorpay payment reference is missing');
        const gateway = await this.gateway();
        const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${gateway.keyId}:${gateway.keySecret}`).toString('base64')}`, 'X-Refund-Idempotency': stableRefundId },
          body: JSON.stringify({ amount: booking.grossAmount, speed: 'normal', notes: { bookingNumber: booking.bookingNumber, reason: claimed.cancelReason || trimmedReason } }),
        });
        refund = await response.json() as Record<string, unknown>;
        if (!response.ok) throw new BadGatewayException(this.text((refund.error as { description?: string } | undefined)?.description, 'Razorpay refund failed'));
      } else throw new BadRequestException('Unsupported payment gateway');
      accepted = true;
      const providerStatus = this.text(refund.refund_status || refund.status, 'PENDING').toUpperCase();
      const processed = ['SUCCESS', 'PROCESSED'].includes(providerStatus);
      const failed = ['FAILED', 'CANCELLED'].includes(providerStatus);
      const cancelled = await this.bookings.findOneAndUpdate(
        { _id: booking._id, status: 'REFUND_REQUESTING' },
        { $set: { status: 'CANCELLED', paymentStatus: processed ? 'REFUNDED' : failed ? 'REFUND_FAILED' : 'REFUND_PENDING', settlementStatus: 'NOT_APPLICABLE', refundId: this.text(refund.refund_id || refund.id, stableRefundId), refundStatus: providerStatus, cancelledAt: new Date() } },
        { new: true },
      );
      if (!cancelled) throw new BadGatewayException('Refund requested, but the booking status could not be updated. Contact support with the booking ID.');
      return cancelled;
    } catch (error) {
      if (!accepted) await this.bookings.updateOne({ _id: booking._id, status: 'REFUND_REQUESTING' }, { $set: { status: 'CONFIRMED', refundStatus: 'REQUEST_FAILED' } });
      throw error;
    }
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

  async ownerAnalytics(ownerId: string, propertyId: string) {
    const property = await this.properties.exists({
      _id: new Types.ObjectId(propertyId),
      ownerId: new Types.ObjectId(ownerId),
    });
    if (!property) throw new NotFoundException('Property not found');
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const start = new Date(`${today}T00:00:00+05:30`);
    const weekStart = new Date(start.getTime() - 6 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const bookings = await this.bookings
      .find({
        ownerId: new Types.ObjectId(ownerId),
        propertyId: new Types.ObjectId(propertyId),
        $or: [
          { checkIn: { $gte: weekStart, $lt: tomorrow } },
          { checkOut: { $gt: weekStart }, checkIn: { $lt: weekStart } },
          { paidAt: { $gte: weekStart, $lt: tomorrow } },
        ],
      })
      .lean();
    const paid = bookings.filter(
      (booking) =>
        booking.paymentStatus === 'PAID' && booking.status !== 'CANCELLED',
    );
    const overlappingNights = (from: Date, to: Date, booking: Booking) =>
      Math.max(
        0,
        Math.round(
          (Math.min(new Date(booking.checkOut).getTime(), to.getTime()) -
            Math.max(new Date(booking.checkIn).getTime(), from.getTime())) /
            86400000,
        ),
      ) * booking.rooms;
    const sum = (items: Booking[], field: 'ownerNetAmount' | 'roomAmount') =>
      items.reduce((total, booking) => total + booking[field], 0);
    const todayPaid = paid.filter(
      (booking) =>
        booking.paidAt &&
        new Date(booking.paidAt) >= start &&
        new Date(booking.paidAt) < tomorrow,
    );
    const weekPaid = paid.filter(
      (booking) =>
        booking.paidAt &&
        new Date(booking.paidAt) >= weekStart &&
        new Date(booking.paidAt) < tomorrow,
    );
    const todayNights = paid.reduce(
      (total, booking) => total + overlappingNights(start, tomorrow, booking),
      0,
    );
    const weekNights = paid.reduce(
      (total, booking) =>
        total + overlappingNights(weekStart, tomorrow, booking),
      0,
    );
    return {
      asOf: now.toISOString(),
      timeZone: 'Asia/Kolkata',
      today: {
        roomNights: todayNights,
        revenue: sum(todayPaid, 'ownerNetAmount'),
        checkIns: paid.filter(
          (booking) =>
            new Date(booking.checkIn) >= start &&
            new Date(booking.checkIn) < tomorrow,
        ).length,
      },
      last7Days: {
        roomNights: weekNights,
        revenue: sum(weekPaid, 'ownerNetAmount'),
        checkIns: paid.filter(
          (booking) =>
            new Date(booking.checkIn) >= weekStart &&
            new Date(booking.checkIn) < tomorrow,
        ).length,
        averageSellingPrice: weekNights
          ? Math.round(
              paid.reduce(
                (total, booking) =>
                  total +
                  (booking.roomAmount /
                    Math.max(1, booking.nights * booking.rooms)) *
                    overlappingNights(weekStart, tomorrow, booking),
                0,
              ) / weekNights,
            )
          : null,
      },
      visits: null,
      conversionRate: null,
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
    if (event.event?.startsWith('refund.')) {
      const refund = event.payload?.refund?.entity;
      if (refund?.id) {
        const status = this.text(refund.status).toUpperCase();
        await this.bookings.updateOne(
          { refundId: String(refund.id), status: 'CANCELLED', paymentStatus: { $in: ['REFUND_PENDING', 'REFUND_FAILED'] } },
          { $set: { refundStatus: status, paymentStatus: status === 'PROCESSED' ? 'REFUNDED' : status === 'FAILED' ? 'REFUND_FAILED' : 'REFUND_PENDING' } },
        );
      }
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
        refund?: { refund_id?: string; refund_status?: string };
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
    if (event.type === 'REFUND_STATUS_WEBHOOK' && event.data?.refund?.refund_id) {
      const status = this.text(event.data.refund.refund_status).toUpperCase();
      await this.bookings.updateOne(
        { refundId: event.data.refund.refund_id, status: 'CANCELLED', paymentStatus: { $in: ['REFUND_PENDING', 'REFUND_FAILED'] } },
        { $set: { refundStatus: status, paymentStatus: status === 'SUCCESS' ? 'REFUNDED' : ['FAILED', 'CANCELLED'].includes(status) ? 'REFUND_FAILED' : 'REFUND_PENDING' } },
      );
    }
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
