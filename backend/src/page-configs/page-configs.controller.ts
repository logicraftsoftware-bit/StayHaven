import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
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
  private assertSite(
    user: { role: Role; adminLevel?: string; siteIds?: string[] },
    siteId: string,
  ) {
    if (
      user.role !== Role.SUPER_ADMIN &&
      user.adminLevel !== 'MAIN_ADMIN' &&
      !user.siteIds?.includes(siteId)
    )
      throw new ForbiddenException(
        'This marketplace site is not assigned to your account',
      );
  }
  @Get(':page') async get(
    @Param('siteId', MongoIdPipe) siteId: string,
    @Param('page') page: string,
    @Req() req: { user: { role: Role; siteIds?: string[] } },
  ) {
    this.assertSite(req.user, siteId);
    return { success: true, data: await this.service.getAdmin(siteId, page) };
  }
  @Patch(':page') async update(
    @Param('siteId', MongoIdPipe) siteId: string,
    @Param('page') page: string,
    @Body() dto: UpdatePageConfigDto,
    @Req() req: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    this.assertSite(req.user, siteId);
    return {
      success: true,
      data: await this.service.updateDraft(siteId, page, dto, req.user.sub),
    };
  }
  @Post(':page/publish') async publish(
    @Param('siteId', MongoIdPipe) siteId: string,
    @Param('page') page: string,
    @Req() req: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    this.assertSite(req.user, siteId);
    return {
      success: true,
      data: await this.service.publish(siteId, page, req.user.sub),
    };
  }
}
