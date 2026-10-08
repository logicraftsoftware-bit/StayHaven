import { BadRequestException } from '@nestjs/common';

export type PricingMaster = {
  gstSlabs: Array<{ maxNightlyRate: number | null; ratePercent: number }>;
  coupons: Array<{ code: string; percent: number; minBillAmount?: number; active: boolean; startsAt?: string; endsAt?: string }>;
};

export function calculateBookingPrice(input: {
  roomRateTotal: number;
  nightlyRates?: number[];
  extraGuestTotal: number;
  rooms: number;
  nights: number;
  propertyTax: number;
  gstIncluded: boolean;
  couponCode?: string;
  master: PricingMaster;
  now?: Date;
}) {
  const cents = (value: number) => Math.round(value * 100);
  const roomAmount = cents(input.roomRateTotal * input.rooms);
  const extraGuestAmount = cents(input.extraGuestTotal);
  const propertyTaxAmount = cents(input.propertyTax);
  const listedSubtotal = roomAmount + extraGuestAmount;
  if (!Number.isFinite(listedSubtotal) || listedSubtotal < 100 ||
    input.rooms < 1 || input.nights < 1 ||
    !Number.isInteger(input.rooms) || !Number.isInteger(input.nights))
    throw new BadRequestException('A valid room price is required');
  const nightlyRates = input.nightlyRates?.length === input.nights
    ? input.nightlyRates : Array.from({ length: input.nights }, () => input.roomRateTotal / input.nights);
  const rates = nightlyRates.map((nightlyRate) =>
    input.master.gstSlabs.find((item) => item.maxNightlyRate === null || nightlyRate <= item.maxNightlyRate)?.ratePercent || 0);
  const gstRatePercent = rates.every((rate) => rate === rates[0]) ? rates[0] : null;
  const code = input.couponCode?.trim().toUpperCase() || '';
  const coupon = code ? input.master.coupons.find((item) => item.code === code) : undefined;
  const today = (input.now || new Date()).toISOString().slice(0, 10);
  if (code && (!coupon?.active || (coupon.startsAt && today < coupon.startsAt.slice(0, 10)) || (coupon.endsAt && today > coupon.endsAt.slice(0, 10))))
    throw new BadRequestException('Coupon is unavailable or expired');
  if (coupon && listedSubtotal < cents(coupon.minBillAmount || 0))
    throw new BadRequestException(`This coupon needs a room bill of at least ₹${Number(coupon.minBillAmount).toLocaleString('en-IN')} before GST and discount`);
  const couponDiscountAmount = coupon ? Math.min(listedSubtotal, Math.round(listedSubtotal * coupon.percent / 100)) : 0;
  const afterDiscount = listedSubtotal - couponDiscountAmount;
  const discountedNightlyUnit = nightlyRates.map((rate) =>
    (rate + input.extraGuestTotal / (input.rooms * input.nights)) * afterDiscount / listedSubtotal);
  const gstAmount = Math.round(discountedNightlyUnit.reduce((sum, rate, index) =>
    sum + rate * input.rooms * 100 * (input.gstIncluded
      ? rates[index] / (100 + rates[index])
      : rates[index] / 100), 0));
  const grossAmount = afterDiscount + (input.gstIncluded ? 0 : gstAmount) + propertyTaxAmount;
  if (grossAmount < 100)
    throw new BadRequestException('Total after coupon must be at least ₹1');
  return {
    roomAmount,
    extraGuestAmount,
    couponCode: coupon?.code || '',
    couponPercent: coupon?.percent || 0,
    couponMinBillAmount: coupon?.minBillAmount || 0,
    couponDiscountAmount,
    gstRatePercent,
    gstIncluded: input.gstIncluded,
    gstAmount,
    propertyTaxAmount,
    taxAmount: gstAmount + propertyTaxAmount,
    grossAmount,
  };
}
