import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking } from '../payments/schemas/booking.schema';
import { Property } from '../properties/schemas/property.schema';
import { PropertyStatus } from '../common/enums/status.enum';
import { GuestReview } from './review.schema';
import { SubmitReviewDto } from './review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(GuestReview.name) private reviews: Model<GuestReview>,
    @InjectModel(Booking.name) private bookings: Model<Booking>,
    @InjectModel(Property.name) private properties: Model<Property>,
  ) {}

  async publicReviews(siteId: string, slug: string) {
    const property = await this.properties
      .findOne({
        siteId,
        slug,
        status: PropertyStatus.APPROVED,
        active: { $ne: false },
      })
      .select('_id')
      .lean();
    if (!property) throw new NotFoundException('Property not found');
    const reviews = await this.reviews
      .find({ propertyId: property._id })
      .sort({ createdAt: -1 })
      .select(
        'guestName rating comment categories ownerReply repliedAt createdAt',
      )
      .lean();
    return this.summary(reviews);
  }

  async eligible(customerId: string, propertyId: string) {
    if (!Types.ObjectId.isValid(propertyId))
      throw new BadRequestException('Invalid property');
    const bookings = await this.bookings
      .find({
        customerId,
        propertyId,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        checkOut: { $lte: new Date() },
      })
      .sort({ checkOut: -1 })
      .select('_id bookingNumber roomName checkOut')
      .lean();
    const reviewed = await this.reviews
      .find({ bookingId: { $in: bookings.map((booking) => booking._id) } })
      .select('bookingId')
      .lean();
    const reviewedIds = new Set(
      reviewed.map((review) => String(review.bookingId)),
    );
    return bookings.filter((booking) => !reviewedIds.has(String(booking._id)));
  }

  async submit(customerId: string, dto: SubmitReviewDto) {
    const booking = await this.bookings
      .findOne({
        _id: dto.bookingId,
        customerId,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      })
      .lean();
    if (!booking) throw new NotFoundException('Paid booking not found');
    if (booking.checkOut > new Date())
      throw new BadRequestException('You can review this stay after checkout');
    const exists = await this.reviews.exists({ bookingId: booking._id });
    if (exists)
      throw new BadRequestException('This booking has already been reviewed');
    try {
      return await this.reviews.create({
        bookingId: booking._id,
        propertyId: booking.propertyId,
        siteId: booking.siteId,
        ownerId: booking.ownerId,
        customerId: booking.customerId,
        bookingNumber: booking.bookingNumber,
        guestName: booking.guestName,
        roomName: booking.roomName,
        rating: dto.rating,
        comment: dto.comment?.trim() || '',
        categories: {
          ...(dto.categories?.cleanliness
            ? { cleanliness: dto.categories.cleanliness }
            : {}),
          ...(dto.categories?.location
            ? { location: dto.categories.location }
            : {}),
          ...(dto.categories?.service
            ? { service: dto.categories.service }
            : {}),
          ...(dto.categories?.value ? { value: dto.categories.value } : {}),
        },
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new BadRequestException('This booking has already been reviewed');
      throw error;
    }
  }

  async ownerReviews(
    user: {
      sub: string;
      role: string;
      ownerId?: string;
      propertyIds?: string[];
      permissions?: string[];
    },
    propertyId: string,
  ) {
    await this.checkOwner(user, propertyId, 'VIEW_REVIEWS');
    const reviews = await this.reviews
      .find({ propertyId })
      .sort({ createdAt: -1 })
      .select(
        'bookingNumber guestName roomName rating comment categories ownerReply repliedAt createdAt',
      )
      .lean();
    return this.summary(reviews);
  }

  async reply(
    user: {
      sub: string;
      role: string;
      ownerId?: string;
      propertyIds?: string[];
      permissions?: string[];
    },
    propertyId: string,
    reviewId: string,
    reply: string,
  ) {
    await this.checkOwner(user, propertyId, 'MANAGE_REVIEWS');
    if (!Types.ObjectId.isValid(reviewId))
      throw new BadRequestException('Invalid review');
    const review = await this.reviews.findOneAndUpdate(
      { _id: reviewId, propertyId },
      { ownerReply: reply.trim(), repliedAt: reply.trim() ? new Date() : null },
      { new: true },
    );
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private async checkOwner(
    user: {
      sub: string;
      role: string;
      ownerId?: string;
      propertyIds?: string[];
      permissions?: string[];
    },
    propertyId: string,
    permission: string,
  ) {
    if (!Types.ObjectId.isValid(propertyId))
      throw new BadRequestException('Invalid property');
    const ownerId = user.role === 'TEAM_MEMBER' ? user.ownerId : user.sub;
    if (
      user.role === 'TEAM_MEMBER' &&
      (!user.propertyIds?.includes(propertyId) ||
        !user.permissions?.includes(permission))
    )
      throw new ForbiddenException(`${permission} permission is required`);
    const property = await this.properties.exists({ _id: propertyId, ownerId });
    if (!property) throw new NotFoundException('Property not found');
  }

  private summary(
    reviews: Array<{ rating: number; categories?: Record<string, number> }>,
  ) {
    const distribution = [0, 0, 0, 0, 0];
    const categoryTotals: Record<string, { total: number; count: number }> = {};
    for (const review of reviews) {
      distribution[review.rating - 1] += 1;
      for (const [key, value] of Object.entries(review.categories || {})) {
        if (typeof value !== 'number') continue;
        categoryTotals[key] ||= { total: 0, count: 0 };
        categoryTotals[key].total += value;
        categoryTotals[key].count += 1;
      }
    }
    return {
      count: reviews.length,
      average: reviews.length
        ? Math.round(
            (reviews.reduce((total, review) => total + review.rating, 0) /
              reviews.length) *
              10,
          ) / 10
        : 0,
      distribution,
      categories: Object.fromEntries(
        Object.entries(categoryTotals).map(([key, value]) => [
          key,
          Math.round((value.total / value.count) * 10) / 10,
        ]),
      ),
      reviews,
    };
  }
}
