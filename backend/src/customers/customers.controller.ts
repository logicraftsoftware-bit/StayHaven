import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
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
  AddCoTravellerDto,
  ChangeCustomerPasswordDto,
  CompleteCustomerRegistrationDto,
  CustomerLoginDto,
  RegisterCustomerDto,
  RequestCustomerAccessDto,
  RequestCustomerOtpDto,
  ResetCustomerPasswordDto,
  UpdateCustomerDto,
  VerifyCustomerOtpDto,
} from './dto/customer.dto';
import { CustomersService } from './customers.service';
import { CustomerActiveGuard } from './customer-active.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../media/media.service';

@ApiTags('Customer authentication')
@Controller('customer/auth')
export class CustomerAuthController {
  constructor(
    private customers: CustomersService,
    private sites: SitesService,
  ) {}
  @Post('access/otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async requestAccessOtp(@Body() dto: RequestCustomerAccessDto) {
    return {
      success: true,
      message: 'Verification code sent on WhatsApp',
      data: await this.customers.requestAccessOtp(dto),
    };
  }
  @Post('otp/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async requestOtp(@Body() dto: RequestCustomerOtpDto) {
    return {
      success: true,
      message: 'Verification code sent on WhatsApp',
      data: await this.customers.requestOtp(dto),
    };
  }
  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyOtp(@Body() dto: VerifyCustomerOtpDto) {
    return {
      success: true,
      message: 'Mobile number verified',
      data: await this.customers.verifyOtp(dto),
    };
  }
  @Post('register/complete')
  async complete(
    @Body() dto: CompleteCustomerRegistrationDto,
    @Req() req: Request,
  ) {
    const site = await this.sites.resolveActiveByDomain(requestHostname(req));
    return {
      success: true,
      message: 'Customer account created',
      data: await this.customers.completeRegistration(dto, String(site._id)),
    };
  }
  @Post('password/reset')
  async reset(@Body() dto: ResetCustomerPasswordDto) {
    return {
      success: true,
      message: 'Password reset successfully',
      data: await this.customers.resetPassword(dto),
    };
  }
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
  constructor(
    private customers: CustomersService,
    private media: MediaService,
  ) {}
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
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: 5 * 1024 * 1024 },
    }),
  )
  async avatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: { user: { sub: string } },
  ) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Select a profile image');
    const buffer = file.buffer;
    const extension =
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        ? 'jpg'
        : buffer
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'png'
          : buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
              buffer.subarray(8, 12).toString('ascii') === 'WEBP'
            ? 'webp'
            : '';
    if (!extension)
      throw new BadRequestException('Use a JPG, PNG, or WEBP image');
    const uploaded = await this.media.upload(
      buffer,
      'image',
      extension,
      'customer-avatars',
    );
    return {
      success: true,
      message: 'Profile image updated',
      data: await this.customers.updateAvatar(req.user.sub, uploaded.url),
    };
  }
  @Patch('me/password') async password(
    @Body() dto: ChangeCustomerPasswordDto,
    @Req() req: { user: { sub: string } },
  ) {
    await this.customers.changePassword(req.user.sub, dto);
    return { success: true, message: 'Password changed successfully' };
  }
  @Get('sessions') async sessions(
    @Req() req: { user: { sub: string; sid?: string } },
  ) {
    const sessions = await this.customers.sessions(req.user.sub);
    return {
      success: true,
      data: sessions.map((session) => ({
        ...session,
        current: Boolean(req.user.sid && session.id === req.user.sid),
      })),
    };
  }
  @Delete('sessions') async revokeSessions(
    @Req() req: { user: { sub: string } },
  ) {
    await this.customers.revokeSessions(req.user.sub);
    return { success: true, message: 'All sessions signed out' };
  }
  @Delete('sessions/:id') async revokeSession(
    @Param('id') id: string,
    @Req() req: { user: { sub: string; sid?: string } },
  ) {
    if (req.user.sid === id)
      throw new BadRequestException(
        'Use account logout to sign out this device',
      );
    await this.customers.revokeSession(req.user.sub, id);
    return { success: true, message: 'Device signed out' };
  }
  @Post('co-travellers') async addTraveller(
    @Body() dto: AddCoTravellerDto,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.customers.addTraveller(req.user.sub, dto),
    };
  }
  @Delete('co-travellers/:id') async removeTraveller(
    @Param('id') id: string,
    @Req() req: { user: { sub: string } },
  ) {
    await this.customers.removeTraveller(req.user.sub, id);
    return { success: true };
  }
}
