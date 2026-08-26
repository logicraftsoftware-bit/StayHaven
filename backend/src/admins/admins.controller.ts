import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminsService } from './admins.service';
import { ChangePasswordDto, UpdateAdminDto } from './dto/admin.dto';
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminsController {
  constructor(private service: AdminsService) {}
  @Get('me') async me(@Req() r: { user: { sub: string } }) {
    return { success: true, data: await this.service.findSafe(r.user.sub) };
  }
  @Patch('me') async update(
    @Req() r: { user: { sub: string } },
    @Body() dto: UpdateAdminDto,
  ) {
    return {
      success: true,
      message: 'Profile updated',
      data: await this.service.update(r.user.sub, dto),
    };
  }
  @Patch('me/password') async password(
    @Req() r: { user: { sub: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.service.changePassword(r.user.sub, dto);
    return { success: true, message: 'Password changed', data: null };
  }
}
