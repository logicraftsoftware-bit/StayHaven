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
  ChangeOwnerPasswordDto,
  OwnerLoginDto,
  RegisterOwnerDto,
  UpdateOwnerProfileDto,
} from './dto/owner-account.dto';
import { OwnersService } from './owners.service';
import { OwnerStatusGuard } from './owner-status.guard';

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
    const site = await this.sites.resolveActiveByDomain(requestHostname(req));
    return {
      success: true,
      message: 'Global owner account created',
      data: await this.owners.register(dto, {
        siteId: String(site._id),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
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
}

@ApiTags('Owner account')
@ApiBearerAuth()
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard, OwnerStatusGuard)
@Roles(Role.HOTEL_OWNER)
export class OwnerAccountController {
  constructor(private owners: OwnersService) {}

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
