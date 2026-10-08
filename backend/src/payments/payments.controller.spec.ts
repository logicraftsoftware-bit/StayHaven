import { Types } from 'mongoose';
import { CustomerPaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SitesService } from '../sites/sites.service';
import { CreateBookingOrderDto } from './dto/payment.dto';

describe('CustomerPaymentsController marketplace isolation', () => {
  const siteId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const dto = { propertyId: String(propertyId), roomId: 'deluxe', checkIn: '2099-01-10', checkOut: '2099-01-11', rooms: 1, adults: 2, children: 0, guestName: 'Guest', guestEmail: 'guest@example.com', guestPhone: '9876543210' } as CreateBookingOrderDto;
  const request = { user: { sub: 'customer-1' }, headers: { host: 'shillong.example' }, socket: { remoteAddress: '192.0.2.1' } };

  it('resolves the current domain for online booking, without trusting a client site ID', async () => {
    const sites = { resolveActiveByDomain: jest.fn().mockResolvedValue({ _id: siteId }) };
    const payments = { createOrder: jest.fn().mockResolvedValue({ bookingId: 'booking-1' }) };
    const controller = new CustomerPaymentsController(payments as unknown as PaymentsService, sites as unknown as SitesService);
    await controller.order(request as never, dto);
    expect(sites.resolveActiveByDomain).toHaveBeenCalledWith('shillong.example');
    expect(payments.createOrder).toHaveBeenCalledWith('customer-1', String(siteId), dto);
  });

  it('resolves the current domain for pay-at-hotel booking', async () => {
    const sites = { resolveActiveByDomain: jest.fn().mockResolvedValue({ _id: siteId }) };
    const payments = { createPayAtHotelBooking: jest.fn().mockResolvedValue({ bookingId: 'booking-1' }) };
    const controller = new CustomerPaymentsController(payments as unknown as PaymentsService, sites as unknown as SitesService);
    await controller.payAtHotel(request as never, dto);
    expect(payments.createPayAtHotelBooking).toHaveBeenCalledWith('customer-1', String(siteId), dto);
  });

  it('downloads only a booking resolved for the authenticated customer', async () => {
    const pdf = Buffer.from('%PDF-test');
    const payments = {
      customerBooking: jest.fn().mockResolvedValue({ bookingNumber: 'GH-TEST-123', siteId }),
      customerBookingDocument: jest.fn().mockResolvedValue(pdf),
    };
    const sites = { get: jest.fn().mockResolvedValue({ name: 'Shillong Stays' }) };
    const response = { setHeader: jest.fn(), end: jest.fn() };
    const controller = new CustomerPaymentsController(payments as unknown as PaymentsService, sites as unknown as SitesService);
    await controller.invoice(request as never, 'booking-1', response as never);
    expect(payments.customerBooking).toHaveBeenCalledWith('customer-1', 'booking-1');
    expect(payments.customerBookingDocument).toHaveBeenCalledWith('customer-1', 'booking-1', 'Shillong Stays');
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(response.end).toHaveBeenCalledWith(pdf);
  });
});
