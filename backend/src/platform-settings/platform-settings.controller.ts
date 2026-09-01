import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateMapSettingsDto } from './dto/platform-setting.dto';
import { PlatformSettingsService } from './platform-settings.service';

@ApiTags('Platform settings')
@Controller()
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get('settings/maps')
  async publicMaps() {
    return { success: true, data: await this.service.maps() };
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
