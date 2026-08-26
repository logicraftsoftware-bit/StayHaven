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
import { CreateSiteDto, SiteStatusDto, UpdateSiteDto } from './dto/site.dto';
import { SitesService } from './sites.service';
@ApiTags('Sites')
@ApiBearerAuth()
@Controller('admin/sites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SitesController {
  constructor(private service: SitesService) {}
  @Post() async create(
    @Body() d: CreateSiteDto,
    @Req() r: { user: { sub: string } },
  ) {
    return {
      success: true,
      message: 'Site created',
      data: await this.service.create(d, r.user.sub),
    };
  }
  @Get() async list() {
    return { success: true, data: await this.service.list() };
  }
  @Get(':id') async get(@Param('id', MongoIdPipe) id: string) {
    return { success: true, data: await this.service.get(id) };
  }
  @Patch(':id') async update(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: UpdateSiteDto,
    @Req() r: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.service.update(id, d, r.user.sub),
    };
  }
  @Patch(':id/status') async status(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: SiteStatusDto,
    @Req() r: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.service.status(id, d, r.user.sub),
    };
  }
}
