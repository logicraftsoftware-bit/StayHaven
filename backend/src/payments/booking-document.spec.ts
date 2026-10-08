import {
  renderBookingDocument,
  type BookingDocumentData,
} from './booking-document';

const booking: BookingDocumentData = {
  bookingNumber: 'GH-TEST-123',
  createdAt: new Date('2026-10-08T09:00:00Z'),
  status: 'CONFIRMED',
  paymentStatus: 'PAY_AT_HOTEL',
  propertyName: 'Example Homestay',
  propertyAddress: 'Baranagar, West Bengal',
  propertyPhone: '9000000000',
  siteName: 'Guwahati Homestay',
  guestName: 'Example Guest',
  guestEmail: 'guest@example.com',
  guestPhone: '9000000000',
  guestDetails: [{ name: 'Second Guest', age: 28 }],
  checkIn: new Date('2026-10-09T00:00:00Z'),
  checkOut: new Date('2026-10-10T00:00:00Z'),
  rooms: 1,
  adults: 2,
  children: 0,
  nights: 1,
  roomName: 'Deluxe Room',
  roomAmount: 600000,
  extraGuestAmount: 0,
  couponCode: 'SAVE10',
  couponDiscountAmount: 60000,
  gstAmount: 27000,
  gstRatePercent: 5,
  gstIncluded: false,
  propertyTaxAmount: 0,
  grossAmount: 567000,
};

describe('booking document', () => {
  it('creates a PDF from a confirmed pay-at-hotel booking snapshot', async () => {
    const file = await renderBookingDocument(booking);
    expect(file.subarray(0, 5).toString()).toBe('%PDF-');
    expect(file.length).toBeGreaterThan(2000);
  });
});
