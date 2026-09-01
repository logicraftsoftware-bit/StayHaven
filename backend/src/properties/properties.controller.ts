import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
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
  @Get() async list(@Query() q: PropertyQueryDto) {
    return { success: true, ...(await this.s.list(q)) };
  }
  @Get(':id') async get(@Param('id', MongoIdPipe) id: string) {
    return { success: true, data: await this.s.getAdminView(id) };
  }
  private result(
    id: string,
    status: PropertyStatus,
    actor: string,
    reason?: string,
  ) {
    return this.s.transition(id, status, actor, reason).then((data) => ({
      success: true,
      message: `Property status changed to ${status}`,
      data,
    }));
  }
  @Patch(':id/approve') approve(
    @Param('id', MongoIdPipe) id: string,
    @Req() r: { user: { sub: string } },
  ) {
    return this.result(id, PropertyStatus.APPROVED, r.user.sub);
  }
  @Patch(':id/reject') reject(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: ReviewReasonDto,
    @Req() r: { user: { sub: string } },
  ) {
    return this.result(id, PropertyStatus.REJECTED, r.user.sub, d.reason);
  }
  @Patch(':id/request-changes') changes(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: ReviewReasonDto,
    @Req() r: { user: { sub: string } },
  ) {
    return this.result(
      id,
      PropertyStatus.CHANGES_REQUIRED,
      r.user.sub,
      d.reason,
    );
  }
  @Patch(':id/suspend') suspend(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: ReviewReasonDto,
    @Req() r: { user: { sub: string } },
  ) {
    return this.result(id, PropertyStatus.SUSPENDED, r.user.sub, d.reason);
  }
}
