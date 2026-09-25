import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Booking } from '../payments/schemas/booking.schema';
import { Property } from '../properties/schemas/property.schema';
import { GuestReview } from './review.schema';
import { ReviewsService } from './reviews.service';

const bookingId = new Types.ObjectId();
const propertyId = new Types.ObjectId();
const customerId = new Types.ObjectId();
const ownerId = new Types.ObjectId();

function setup(checkOut: Date, reviewed = false) {
  const booking = {
    _id: bookingId,
    propertyId,
    siteId: new Types.ObjectId(),
    ownerId,
    customerId,
    bookingNumber: 'GH-123',
    guestName: 'Guest',
    roomName: 'Room',
    checkOut,
  };
  const bookings = {
    findOne: jest
      .fn()
      .mockReturnValue({ lean: jest.fn().mockResolvedValue(booking) }),
  };
  const reviews = {
    exists: jest.fn().mockResolvedValue(reviewed),
    create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
  };
  const properties = { exists: jest.fn().mockResolvedValue(true) };
  const service = new ReviewsService(
    reviews as unknown as Model<GuestReview>,
    bookings as unknown as Model<Booking>,
    properties as unknown as Model<Property>,
  );
  return { service, bookings, reviews, properties };
}

describe('ReviewsService', () => {
  it('rejects reviews before checkout', async () => {
    const { service, reviews } = setup(new Date(Date.now() + 86_400_000));
    await expect(
      service.submit(String(customerId), {
        bookingId: String(bookingId),
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reviews.create).not.toHaveBeenCalled();
  });

  it('allows only one review for a paid completed booking', async () => {
    const { service, reviews, bookings } = setup(
      new Date(Date.now() - 86_400_000),
      true,
    );
    await expect(
      service.submit(String(customerId), {
        bookingId: String(bookingId),
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(bookings.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: String(customerId),
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      }),
    );
    expect(reviews.create).not.toHaveBeenCalled();
  });

  it('blocks an assigned team member without reply permission', async () => {
    const { service, properties } = setup(new Date(Date.now() - 86_400_000));
    await expect(
      service.reply(
        {
          sub: 'member',
          role: 'TEAM_MEMBER',
          ownerId: String(ownerId),
          propertyIds: [String(propertyId)],
          permissions: ['VIEW_REVIEWS'],
        },
        String(propertyId),
        String(new Types.ObjectId()),
        'Thank you',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(properties.exists).not.toHaveBeenCalled();
  });
});
