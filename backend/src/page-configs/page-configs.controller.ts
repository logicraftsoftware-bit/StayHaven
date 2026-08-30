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
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { UpdatePageConfigDto } from './dto/page-config.dto';
import { PageConfigsService } from './page-configs.service';
@ApiTags('Page configuration')
@ApiBearerAuth()
@Controller('admin/sites/:siteId/pages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class PageConfigsController {
  constructor(private service: PageConfigsService) {}
  @Get(':page') async get(
    @Param('siteId', MongoIdPipe) siteId: string,
    @Param('page') page: string,
  ) {
    return { success: true, data: await this.service.getAdmin(siteId, page) };
  }
  @Patch(':page') async update(
    @Param('siteId', MongoIdPipe) siteId: string,
    @Param('page') page: string,
    @Body() dto: UpdatePageConfigDto,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.service.updateDraft(siteId, page, dto, req.user.sub),
    };
  }
  @Post(':page/publish') async publish(
    @Param('siteId', MongoIdPipe) siteId: string,
    @Param('page') page: string,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.service.publish(siteId, page, req.user.sub),
    };
  }
}
