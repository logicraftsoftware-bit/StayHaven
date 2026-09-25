import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../payments/schemas/booking.schema';
import {
  Property,
  PropertySchema,
} from '../properties/schemas/property.schema';
import { OwnersModule } from '../owners/owners.module';
import { SitesModule } from '../sites/sites.module';
import { GuestReview, GuestReviewSchema } from './review.schema';
import {
  CustomerReviewsController,
  OwnerReviewsController,
  PublicReviewsController,
} from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestReview.name, schema: GuestReviewSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Property.name, schema: PropertySchema },
    ]),
    SitesModule,
    OwnersModule,
  ],
  controllers: [
    PublicReviewsController,
    CustomerReviewsController,
    OwnerReviewsController,
  ],
  providers: [ReviewsService],
})
export class ReviewsModule {}
