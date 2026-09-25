import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnerStatusGuard } from '../owners/owner-status.guard';
import { SitesService } from '../sites/sites.service';
import { requestHostname } from '../sites/utils/request-hostname';
import { ReplyReviewDto, SubmitReviewDto } from './review.dto';
import { ReviewsService } from './reviews.service';

@Controller('properties')
export class PublicReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly sites: SitesService,
  ) {}
  @Get(':slug/reviews') async list(
    @Param('slug') slug: string,
    @Req() request: Request,
  ) {
    const site = await this.sites.resolveActiveByDomain(
      requestHostname(request),
    );
    return {
      success: true,
      data: await this.reviews.publicReviews(String(site._id), slug),
    };
  }
}

@Controller('customer/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CustomerReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Get('eligible/:propertyId') async eligible(
    @Req() request: { user: { sub: string } },
    @Param('propertyId') propertyId: string,
  ) {
    return {
      success: true,
      data: await this.reviews.eligible(request.user.sub, propertyId),
    };
  }
  @Post() async submit(
    @Req() request: { user: { sub: string } },
    @Body() dto: SubmitReviewDto,
  ) {
    return {
      success: true,
      data: await this.reviews.submit(request.user.sub, dto),
    };
  }
}

type OwnerUser = {
  sub: string;
  role: string;
  ownerId?: string;
  propertyIds?: string[];
  permissions?: string[];
};
@Controller('owner/properties/:propertyId/reviews')
@UseGuards(JwtAuthGuard, RolesGuard, OwnerStatusGuard)
@Roles(Role.HOTEL_OWNER, Role.TEAM_MEMBER)
export class OwnerReviewsController {
  constructor(private readonly reviews: ReviewsService) {}
  @Get() async list(
    @Req() request: { user: OwnerUser },
    @Param('propertyId') propertyId: string,
  ) {
    return {
      success: true,
      data: await this.reviews.ownerReviews(request.user, propertyId),
    };
  }
  @Patch(':reviewId/reply') async reply(
    @Req() request: { user: OwnerUser },
    @Param('propertyId') propertyId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return {
      success: true,
      data: await this.reviews.reply(
        request.user,
        propertyId,
        reviewId,
        dto.reply,
      ),
    };
  }
}
