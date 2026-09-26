import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnerStatusGuard } from '../owners/owner-status.guard';
import {
  CreateBookingOrderDto,
  PaymentQueryDto,
  RequestWithdrawalDto,
  SaveBankAccountDto,
  VerifyPaymentDto,
  VerifyCashfreePaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Customer bookings and payments')
@ApiBearerAuth()
@Controller('customer/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CustomerPaymentsController {
  constructor(private service: PaymentsService) {}
  @Post('order') async order(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateBookingOrderDto,
  ) {
    return {
      success: true,
      data: await this.service.createOrder(req.user.sub, dto),
    };
  }
  @Post('verify') async verify(
    @Req() req: { user: { sub: string } },
    @Body() dto: VerifyPaymentDto,
  ) {
    return {
      success: true,
      message: 'Payment verified and booking confirmed',
      data: await this.service.verifyPayment(req.user.sub, dto),
    };
  }
  @Post('verify-cashfree') async verifyCashfree(
    @Req() req: { user: { sub: string } },
    @Body() dto: VerifyCashfreePaymentDto,
  ) {
    return {
      success: true,
      message: 'Cashfree payment verified and booking confirmed',
      data: await this.service.verifyCashfreePayment(req.user.sub, dto),
    };
  }
  @Get() async list(@Req() req: { user: { sub: string } }) {
    return {
      success: true,
      data: await this.service.customerBookings(req.user.sub),
    };
  }
  @Get(':id') async get(
    @Req() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return {
      success: true,
      data: await this.service.customerBooking(req.user.sub, id),
    };
  }
}

@ApiTags('Owner wallet and settlements')
@ApiBearerAuth()
@Controller('owner/payments')
@UseGuards(JwtAuthGuard, RolesGuard, OwnerStatusGuard)
@Roles(Role.HOTEL_OWNER, Role.TEAM_MEMBER)
export class OwnerPaymentsController {
  constructor(private service: PaymentsService) {}
  @Get('analytics') async analytics(
    @Req() req: { user: PortalPaymentUser },
    @Query() query: PaymentQueryDto,
  ) {
    if (!query.propertyId)
      throw new ForbiddenException('A property is required for analytics');
    return {
      success: true,
      data: await this.service.ownerAnalytics(
        this.ownerId(req.user, query.propertyId, 'VIEW_ANALYTICS'),
        query.propertyId,
      ),
    };
  }
  @Get() async list(
    @Req() req: { user: PortalPaymentUser },
    @Query() query: PaymentQueryDto,
  ) {
    return {
      success: true,
      data: await this.service.ownerPayments(
        this.ownerId(req.user, query.propertyId),
        query,
      ),
    };
  }
  @Patch('bank-account') async bank(
    @Req() req: { user: PortalPaymentUser },
    @Body() dto: SaveBankAccountDto,
  ) {
    if (req.user.role === Role.TEAM_MEMBER)
      throw new ForbiddenException('Only the owner can change bank details');
    return {
      success: true,
      message: 'Withdrawal bank account saved',
      data: await this.service.saveBank(req.user.sub, dto),
    };
  }
  @Post('withdrawals') async withdraw(
    @Req() req: { user: PortalPaymentUser },
    @Body() dto: RequestWithdrawalDto,
  ) {
    if (req.user.role === Role.TEAM_MEMBER)
      throw new ForbiddenException('Only the owner can request withdrawals');
    return {
      success: true,
      message: 'Withdrawal submitted to RazorpayX',
      data: await this.service.requestWithdrawal(req.user.sub, dto),
    };
  }
  private ownerId(
    user: PortalPaymentUser,
    propertyId?: string,
    permission = 'VIEW_PAYMENTS',
  ) {
    if (user.role !== Role.TEAM_MEMBER) return user.sub;
    if (
      !user.permissions?.includes(permission) ||
      !propertyId ||
      !user.propertyIds?.includes(propertyId)
    )
      throw new ForbiddenException(`${permission} permission is required`);
    return user.ownerId || '';
  }
}

type PortalPaymentUser = {
  sub: string;
  role: Role;
  ownerId?: string;
  propertyIds?: string[];
  permissions?: string[];
};

@ApiTags('Razorpay webhooks')
@Controller('payments')
export class RazorpayWebhookController {
  constructor(private service: PaymentsService) {}
  @Post('razorpay/webhook') async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return {
      success: true,
      data: await this.service.webhook(
        req.rawBody || Buffer.from(''),
        signature,
      ),
    };
  }
  @Post('cashfree/webhook') async cashfreeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
  ) {
    return {
      success: true,
      data: await this.service.cashfreeWebhook(
        req.rawBody || Buffer.from(''),
        signature,
        timestamp,
      ),
    };
  }
}
