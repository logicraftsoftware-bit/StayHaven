import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminsService } from './admins.service';
import {
  ChangePasswordDto,
  CreateManagedAdminDto,
  UpdateAdminDto,
  UpdateManagedAdminDto,
} from './dto/admin.dto';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
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
  @Get('users') async users(@Req() r: { user: { sub: string } }) {
    return { success: true, data: await this.service.listManaged(r.user.sub) };
  }
  @Get('users/sites') async userSites(@Req() r: { user: { sub: string } }) {
    return {
      success: true,
      data: await this.service.listAssignableSites(r.user.sub),
    };
  }
  @Post('users') async createUser(
    @Req() r: { user: { sub: string } },
    @Body() dto: CreateManagedAdminDto,
  ) {
    return {
      success: true,
      message: 'Administrator created',
      data: await this.service.createManaged(r.user.sub, dto),
    };
  }
  @Patch('users/:id') async updateUser(
    @Req() r: { user: { sub: string } },
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateManagedAdminDto,
  ) {
    return {
      success: true,
      message: 'Administrator updated',
      data: await this.service.updateManaged(r.user.sub, id, dto),
    };
  }
  @Delete('users/:id') async deleteUser(
    @Req() r: { user: { sub: string } },
    @Param('id', MongoIdPipe) id: string,
  ) {
    await this.service.deleteManaged(r.user.sub, id);
    return { success: true, message: 'Administrator deleted', data: null };
  }
}
