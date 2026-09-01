import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  UpdateAdminBrandingDto,
  UpdateMapSettingsDto,
} from './dto/platform-setting.dto';
import { PlatformSettingsService } from './platform-settings.service';

@ApiTags('Platform settings')
@Controller()
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get('settings/maps')
  async publicMaps() {
    return { success: true, data: await this.service.maps() };
  }

  @Get('settings/admin-branding')
  async publicAdminBranding() {
    return { success: true, data: await this.service.adminBranding() };
  }

  @Patch('admin/settings/admin-branding')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updateAdminBranding(
    @Req() request: Request & { user?: { role?: Role } },
    @Body() dto: UpdateAdminBrandingDto,
  ) {
    if (request.user?.role !== Role.SUPER_ADMIN)
      throw new ForbiddenException('Only the Super Admin can update branding');
    return {
      success: true,
      message: 'Admin panel branding updated',
      data: await this.service.updateAdminBranding(dto),
    };
  }

  @Get('admin/settings/maps')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async adminMaps() {
    return { success: true, data: await this.service.maps() };
  }

  @Patch('admin/settings/maps')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updateMaps(@Body() dto: UpdateMapSettingsDto) {
    return {
      success: true,
      message: dto.googleMapsBrowserKey?.trim()
        ? 'Google Maps enabled'
        : 'Google Maps disabled; fallback map remains active',
      data: await this.service.updateMaps(dto),
    };
  }
}
