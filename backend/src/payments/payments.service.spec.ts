import { Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { PaymentsService } from './payments.service';

describe('PaymentsService booking cancellation', () => {
  const ownerId = new Types.ObjectId();
  const bookingId = new Types.ObjectId();
  const actor = { sub: String(ownerId), role: Role.HOTEL_OWNER };

  function serviceWith(bookings: Record<string, unknown>, settings?: Record<string, unknown>) {
    const service = Object.create(PaymentsService.prototype) as PaymentsService;
    Object.defineProperty(service, 'bookings', { value: bookings });
    Object.defineProperty(service, 'settings', { value: settings || {} });
    return service;
  }

  it('cancels an unpaid pay-at-hotel booking without contacting a gateway', async () => {
    const booking = { _id: bookingId, ownerId, propertyId: new Types.ObjectId(), status: 'CONFIRMED', paymentStatus: 'PAY_AT_HOTEL', checkIn: new Date('2099-01-10') };
    const bookings = { findById: jest.fn().mockResolvedValue(booking), findOneAndUpdate: jest.fn().mockResolvedValue({ ...booking, status: 'CANCELLED' }) };
    const result = await serviceWith(bookings).cancelOwnerBooking(actor, String(bookingId), 'Property unavailable');
    expect(result.status).toBe('CANCELLED');
    expect(bookings.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'PAY_AT_HOTEL' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'CANCELLED', cancelReason: 'Property unavailable' }) }),
      { new: true },
    );
  });

  it('requests an idempotent full Razorpay refund before marking a paid booking cancelled', async () => {
    const booking = { _id: bookingId, ownerId, propertyId: new Types.ObjectId(), bookingNumber: 'GH-TEST', status: 'CONFIRMED', paymentStatus: 'PAID', settlementStatus: 'ON_HOLD', paymentGateway: 'RAZORPAY', razorpayPaymentId: 'pay_test', grossAmount: 300000, checkIn: new Date('2099-01-10') };
    const bookings = { findById: jest.fn().mockResolvedValue(booking), findOneAndUpdate: jest.fn().mockResolvedValueOnce({ ...booking, status: 'REFUND_REQUESTING', cancelReason: 'Property unavailable' }).mockResolvedValueOnce({ ...booking, status: 'CANCELLED', paymentStatus: 'REFUND_PENDING' }) };
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'rfnd_test', status: 'created' }) });
    global.fetch = fetchMock;
    try {
      const service = serviceWith(bookings, { razorpay: async () => ({ keyId: 'rzp_test', keySecret: 'secret' }) });
      const result = await service.cancelOwnerBooking(actor, String(bookingId), 'Property unavailable');
      expect(result.paymentStatus).toBe('REFUND_PENDING');
      expect(fetchMock).toHaveBeenCalledWith('https://api.razorpay.com/v1/payments/pay_test/refund', expect.objectContaining({
        headers: expect.objectContaining({ 'X-Refund-Idempotency': `REFUND_${String(bookingId)}` }),
        body: expect.stringContaining('300000'),
      }));
      expect(bookings.findOneAndUpdate).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ status: 'REFUND_REQUESTING' }),
        expect.objectContaining({ $set: expect.objectContaining({ status: 'CANCELLED', paymentStatus: 'REFUND_PENDING', refundId: 'rfnd_test' }) }),
        { new: true },
      );
    } finally { global.fetch = originalFetch; }
  });

  it('rejects refunds after the owner wallet settlement', async () => {
    const booking = { _id: bookingId, ownerId, status: 'CONFIRMED', paymentStatus: 'PAID', settlementStatus: 'SETTLED', checkIn: new Date('2099-01-10') };
    const bookings = { findById: jest.fn().mockResolvedValue(booking), findOneAndUpdate: jest.fn() };
    await expect(serviceWith(bookings).cancelOwnerBooking(actor, String(bookingId), 'Property unavailable')).rejects.toThrow('support-assisted cancellation');
    expect(bookings.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('lets the booking customer cancel a future pay-at-hotel stay', async () => {
    const booking = { _id: bookingId, customerId: 'guest-1', status: 'CONFIRMED', paymentStatus: 'PAY_AT_HOTEL', checkIn: new Date('2099-01-10') };
    const bookings = { findOne: jest.fn().mockResolvedValue(booking), findOneAndUpdate: jest.fn().mockResolvedValue({ ...booking, status: 'CANCELLED' }) };
    const result = await serviceWith(bookings).cancelCustomerBooking('guest-1', String(bookingId), 'Plans changed');
    expect(result.status).toBe('CANCELLED');
    expect(bookings.findOne).toHaveBeenCalledWith({ _id: String(bookingId), customerId: 'guest-1' });
  });

  it('does not let another customer cancel the stay', async () => {
    const bookings = { findOne: jest.fn().mockResolvedValue(null), findOneAndUpdate: jest.fn() };
    await expect(serviceWith(bookings).cancelCustomerBooking('stranger', String(bookingId), 'Plans changed')).rejects.toThrow('Booking not found');
    expect(bookings.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('PaymentsService booking site guard', () => {
  it.each(['createOrder', 'createPayAtHotelBooking'] as const)('%s restricts the property query to the resolved site', async (method) => {
    const propertyId = new Types.ObjectId();
    const siteId = new Types.ObjectId();
    const propertyQuery = { lean: jest.fn().mockResolvedValue(null) };
    const findOne = jest.fn().mockReturnValue(propertyQuery);
    const service = Object.create(PaymentsService.prototype) as PaymentsService;
    Object.defineProperty(service, 'properties', { value: { findOne } });
    Object.defineProperty(service, 'customers', { value: { findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({}) }) } });
    await expect(service[method]('customer-1', String(siteId), { propertyId: String(propertyId) } as never)).rejects.toThrow('Live property not found');
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: String(propertyId), siteId }));
  });
});
