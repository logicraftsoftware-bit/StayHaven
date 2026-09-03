import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SitesService } from '../sites/sites.service';
import { requestHostname } from '../sites/utils/request-hostname';
import {
  ChangeCustomerPasswordDto,
  CustomerLoginDto,
  RegisterCustomerDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { CustomersService } from './customers.service';
import { CustomerActiveGuard } from './customer-active.guard';

@ApiTags('Customer authentication')
@Controller('customer/auth')
export class CustomerAuthController {
  constructor(
    private customers: CustomersService,
    private sites: SitesService,
  ) {}
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterCustomerDto, @Req() req: Request) {
    const site = await this.sites.resolveActiveByDomain(requestHostname(req));
    return {
      success: true,
      message: 'Customer account created',
      data: await this.customers.register(dto, String(site._id)),
    };
  }
  @Post('login') @Throttle({ default: { limit: 5, ttl: 60000 } }) async login(
    @Body() dto: CustomerLoginDto,
  ) {
    return {
      success: true,
      message: 'Customer login successful',
      data: await this.customers.login(dto),
    };
  }
}

@ApiTags('Customer account')
@ApiBearerAuth()
@Controller('customer')
@UseGuards(JwtAuthGuard, RolesGuard, CustomerActiveGuard)
@Roles(Role.CUSTOMER)
export class CustomerAccountController {
  constructor(private customers: CustomersService) {}
  @Get('me') async me(@Req() req: { user: { sub: string } }) {
    return { success: true, data: await this.customers.me(req.user.sub) };
  }
  @Patch('me') async update(
    @Body() dto: UpdateCustomerDto,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.customers.update(req.user.sub, dto),
    };
  }
  @Patch('me/password') async password(
    @Body() dto: ChangeCustomerPasswordDto,
    @Req() req: { user: { sub: string } },
  ) {
    await this.customers.changePassword(req.user.sub, dto);
    return { success: true, message: 'Password changed successfully' };
  }
}
