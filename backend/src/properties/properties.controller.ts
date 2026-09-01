import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { PropertyStatus } from '../common/enums/status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { PropertyQueryDto, ReviewReasonDto } from './dto/property.dto';
import { PropertiesService } from './properties.service';
@ApiTags('Properties')
@ApiBearerAuth()
@Controller('admin/properties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class PropertiesController {
  constructor(private s: PropertiesService) {}
  private scope(user: { role: Role; siteIds?: string[] }) { return user.role === Role.SUPER_ADMIN ? undefined : (user.siteIds || []); }
  private assertSite(user: { role: Role; siteIds?: string[] }, siteId: unknown) {
    if (user.role !== Role.SUPER_ADMIN && !user.siteIds?.includes(String(siteId))) throw new ForbiddenException('This property belongs to an unassigned marketplace site');
  }
  @Get() async list(@Query() q: PropertyQueryDto, @Req() r: { user: { role: Role; siteIds?: string[] } }) {
    if (q.siteId) this.assertSite(r.user, q.siteId);
    return { success: true, ...(await this.s.list(q, this.scope(r.user))) };
  }
  @Get(':id') async get(@Param('id', MongoIdPipe) id: string, @Req() r: { user: { role: Role; siteIds?: string[] } }) {
    const data = await this.s.getAdminView(id); this.assertSite(r.user, data.siteId);
    return { success: true, data };
  }
  private result(
    id: string,
    status: PropertyStatus,
    user: { sub: string; role: Role; siteIds?: string[] },
    reason?: string,
  ) {
    return this.s.getAdminView(id).then((property) => {
      this.assertSite(user, property.siteId);
      return this.s.transition(id, status, user.sub, reason);
    }).then((data) => ({ success: true, message: `Property status changed to ${status}`, data }));
  }
  @Patch(':id/approve') approve(
    @Param('id', MongoIdPipe) id: string,
    @Req() r: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    return this.result(id, PropertyStatus.APPROVED, r.user);
  }
  @Patch(':id/reject') reject(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: ReviewReasonDto,
    @Req() r: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    return this.result(id, PropertyStatus.REJECTED, r.user, d.reason);
  }
  @Patch(':id/request-changes') changes(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: ReviewReasonDto,
    @Req() r: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    return this.result(
      id,
      PropertyStatus.CHANGES_REQUIRED,
      r.user,
      d.reason,
    );
  }
  @Patch(':id/suspend') suspend(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: ReviewReasonDto,
    @Req() r: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    return this.result(id, PropertyStatus.SUSPENDED, r.user, d.reason);
  }
}
