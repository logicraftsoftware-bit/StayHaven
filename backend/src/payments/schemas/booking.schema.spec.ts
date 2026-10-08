import { BookingSchema } from './booking.schema';

describe('Booking gateway ID indexes', () => {
  it('uniquely indexes only real gateway IDs, not empty pay-at-hotel IDs', () => {
    const indexes = BookingSchema.indexes();
    for (const field of [
      'gatewayOrderId',
      'gatewayPaymentId',
      'razorpayOrderId',
      'razorpayPaymentId',
    ]) {
      const matching = indexes.filter(
        ([keys]) => keys[field] === 1 && Object.keys(keys).length === 1,
      );
      expect(matching).toHaveLength(1);
      expect(matching[0][1]).toMatchObject({
        unique: true,
        name: `${field}_unique_string`,
        partialFilterExpression: { [field]: { $type: 'string' } },
      });
      expect(matching[0][1].sparse).toBeUndefined();
    }
  });
});
