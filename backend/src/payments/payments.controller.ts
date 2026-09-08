import {
  Body,
  Controller,
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
@Roles(Role.HOTEL_OWNER)
export class OwnerPaymentsController {
  constructor(private service: PaymentsService) {}
  @Get() async list(
    @Req() req: { user: { sub: string } },
    @Query() query: PaymentQueryDto,
  ) {
    return {
      success: true,
      data: await this.service.ownerPayments(req.user.sub, query),
    };
  }
  @Patch('bank-account') async bank(
    @Req() req: { user: { sub: string } },
    @Body() dto: SaveBankAccountDto,
  ) {
    return {
      success: true,
      message: 'Withdrawal bank account saved',
      data: await this.service.saveBank(req.user.sub, dto),
    };
  }
  @Post('withdrawals') async withdraw(
    @Req() req: { user: { sub: string } },
    @Body() dto: RequestWithdrawalDto,
  ) {
    return {
      success: true,
      message: 'Withdrawal submitted to RazorpayX',
      data: await this.service.requestWithdrawal(req.user.sub, dto),
    };
  }
}

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
}
