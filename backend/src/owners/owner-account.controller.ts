import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  ChangeOwnerPasswordDto,
  CompleteOwnerRegistrationDto,
  OwnerLoginDto,
  RegisterOwnerDto,
  RequestOwnerOtpDto,
  ResetOwnerPasswordDto,
  UpdateOwnerProfileDto,
  VerifyOwnerOtpDto,
} from './dto/owner-account.dto';
import { OwnersService } from './owners.service';
import { OwnerStatusGuard } from './owner-status.guard';
import { MediaService } from '../media/media.service';

@ApiTags('Owner authentication')
@Controller('owner/auth')
export class OwnerAuthController {
  constructor(
    private owners: OwnersService,
    private sites: SitesService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterOwnerDto, @Req() req: Request) {
    await this.sites.resolveActiveByDomain(requestHostname(req));
    return {
      success: true,
      message: 'Verification code sent on WhatsApp',
      data: await this.owners.requestOtp({
        phone: dto.phone,
        purpose: 'register',
      }),
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: OwnerLoginDto, @Req() req: Request) {
    return {
      success: true,
      message: 'Owner login successful',
      data: await this.owners.login(dto, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }),
    };
  }

  @Post('otp/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async requestOtp(@Body() dto: RequestOwnerOtpDto) {
    return {
      success: true,
      message: 'Verification code sent on WhatsApp',
      data: await this.owners.requestOtp(dto),
    };
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verifyOtp(@Body() dto: VerifyOwnerOtpDto) {
    return {
      success: true,
      message: 'Mobile number verified',
      data: await this.owners.verifyOtp(dto),
    };
  }

  @Post('register/complete')
  async complete(
    @Body() dto: CompleteOwnerRegistrationDto,
    @Req() req: Request,
  ) {
    const site = await this.sites.resolveActiveByDomain(requestHostname(req));
    return {
      success: true,
      message: 'Owner account created',
      data: await this.owners.completeRegistration(dto, {
        siteId: String(site._id),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }),
    };
  }

  @Post('password/reset')
  async resetPassword(@Body() dto: ResetOwnerPasswordDto) {
    return {
      success: true,
      message: 'Password reset successfully',
      data: await this.owners.resetPassword(dto),
    };
  }
}

@ApiTags('Owner account')
@ApiBearerAuth()
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard, OwnerStatusGuard)
@Roles(Role.HOTEL_OWNER)
export class OwnerAccountController {
  constructor(
    private owners: OwnersService,
    private media: MediaService,
  ) {}

  @Get('me')
  async me(@Req() req: { user: { sub: string } }) {
    return { success: true, data: await this.owners.me(req.user.sub) };
  }

  @Patch('me')
  async update(
    @Body() dto: UpdateOwnerProfileDto,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.owners.updateProfile(req.user.sub, dto),
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
      'owner-avatars',
    );
    return {
      success: true,
      message: 'Profile image updated',
      data: await this.owners.updateProfile(req.user.sub, {
        profileImage: uploaded.url,
      }),
    };
  }

  @Patch('me/password')
  async changePassword(
    @Body() dto: ChangeOwnerPasswordDto,
    @Req() req: { user: { sub: string } },
  ) {
    await this.owners.changePassword(req.user.sub, dto);
    return { success: true, message: 'Password changed successfully' };
  }

  @Get('sites')
  async sites() {
    return { success: true, data: await this.owners.availableSites() };
  }
}
