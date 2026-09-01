import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnerStatusGuard } from '../owners/owner-status.guard';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import {
  SupportTicketDto,
  TeamLoginDto,
  TeamMemberDto,
} from './dto/owner-operation.dto';
import { OwnerOperationsService } from './owner-operations.service';
@ApiTags('Owner operations')
@ApiBearerAuth()
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard, OwnerStatusGuard)
@Roles(Role.HOTEL_OWNER)
export class OwnerOperationsController {
  constructor(private service: OwnerOperationsService) {}
  @Get('team') async team(@Req() r: { user: { sub: string } }) {
    return { success: true, data: await this.service.listTeam(r.user.sub) };
  }
  @Post('team') async add(
    @Req() r: { user: { sub: string } },
    @Body() dto: TeamMemberDto,
  ) {
    return {
      success: true,
      data: await this.service.saveTeam(r.user.sub, dto),
    };
  }
  @Patch('team/:id') async edit(
    @Req() r: { user: { sub: string } },
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: TeamMemberDto,
  ) {
    return {
      success: true,
      data: await this.service.saveTeam(r.user.sub, dto, id),
    };
  }
  @Get('support-tickets') async tickets(@Req() r: { user: { sub: string } }) {
    return { success: true, data: await this.service.listTickets(r.user.sub) };
  }
  @Post('support-tickets') async ticket(
    @Req() r: { user: { sub: string } },
    @Body() dto: SupportTicketDto,
  ) {
    return {
      success: true,
      data: await this.service.createTicket(r.user.sub, dto),
    };
  }
}

@ApiTags('Owner team authentication')
@Controller('owner/team-member')
export class TeamMemberController {
  constructor(private service: OwnerOperationsService) {}
  @Post('login')
  async login(@Body() dto: TeamLoginDto) {
    return {
      success: true,
      data: await this.service.login(dto.email, dto.password),
    };
  }
  @Get('properties')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEAM_MEMBER)
  async properties(
    @Req()
    r: {
      user: { ownerId: string; propertyIds: string[]; permissions: string[] };
    },
  ) {
    return { success: true, data: await this.service.listAssigned(r.user) };
  }
}

@ApiTags('Admin support tickets')
@ApiBearerAuth()
@Controller('admin/support-tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminSupportController {
  constructor(private service: OwnerOperationsService) {}
  @Get() async list() {
    return { success: true, data: await this.service.listAllTickets() };
  }
  @Patch(':id/:status') async update(
    @Param('id', MongoIdPipe) id: string,
    @Param('status') status: string,
  ) {
    return { success: true, data: await this.service.updateTicket(id, status) };
  }
}
