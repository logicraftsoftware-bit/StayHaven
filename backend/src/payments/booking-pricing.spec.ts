import { BadRequestException } from '@nestjs/common';
import { calculateBookingPrice, PricingMaster } from './booking-pricing';

const master: PricingMaster = {
  gstSlabs: [
    { maxNightlyRate: 1000, ratePercent: 0 },
    { maxNightlyRate: 7500, ratePercent: 5 },
    { maxNightlyRate: null, ratePercent: 18 },
  ],
  coupons: [{ code: 'SAVE10', percent: 10, active: true }],
};

const input = {
  roomRateTotal: 3000,
  extraGuestTotal: 0,
  rooms: 1,
  nights: 1,
  propertyTax: 0,
  gstIncluded: false,
  master,
};

describe('booking pricing master', () => {
  it('chooses GST by nightly room rate, not whole booking total', () => {
    const quote = calculateBookingPrice({ ...input, roomRateTotal: 2000, rooms: 2, nights: 2 });
    expect(quote.gstRatePercent).toBe(0);
    expect(quote.grossAmount).toBe(400000);
  });

  it('adds GST after percentage discount for excluded rates', () => {
    const quote = calculateBookingPrice({ ...input, couponCode: 'save10' });
    expect(quote.couponDiscountAmount).toBe(30000);
    expect(quote.gstAmount).toBe(13500);
    expect(quote.grossAmount).toBe(283500);
  });

  it('extracts included GST without charging it again', () => {
    const quote = calculateBookingPrice({ ...input, gstIncluded: true });
    expect(quote.gstAmount).toBe(14286);
    expect(quote.grossAmount).toBe(300000);
  });

  it('uses each night’s slab when inventory rates cross a threshold', () => {
    const quote = calculateBookingPrice({ ...input, roomRateTotal: 8500, nightlyRates: [1000, 7500], nights: 2 });
    expect(quote.gstRatePercent).toBeNull();
    expect(quote.gstAmount).toBe(37500);
    expect(quote.grossAmount).toBe(887500);
  });

  it('rejects inactive or unknown coupons', () => {
    expect(() => calculateBookingPrice({ ...input, couponCode: 'MISSING' })).toThrow(BadRequestException);
  });
});
