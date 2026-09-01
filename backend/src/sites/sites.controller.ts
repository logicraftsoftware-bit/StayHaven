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
import {
  CreateSiteDomainDto,
  CreateSiteDto,
  SiteStatusDto,
  UpdateSiteDomainDto,
  UpdateSiteDto,
} from './dto/site.dto';
import { SitesService } from './sites.service';
@ApiTags('Sites')
@ApiBearerAuth()
@Controller('admin/sites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SitesController {
  constructor(private service: SitesService) {}
  private scope(user: { role: Role; siteIds?: string[] }) { return user.role === Role.SUPER_ADMIN ? undefined : (user.siteIds || []); }
  private assertSite(user: { role: Role; siteIds?: string[] }, siteId: string) {
    if (user.role !== Role.SUPER_ADMIN && !user.siteIds?.includes(siteId)) throw new ForbiddenException('This marketplace site is not assigned to your account');
  }
  @Post() async create(
    @Body() d: CreateSiteDto,
    @Req() r: { user: { sub: string; role: Role } },
  ) {
    if (r.user.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Only the Super Admin can create marketplace sites');
    return {
      success: true,
      message: 'Site created',
      data: await this.service.create(d, r.user.sub),
    };
  }
  @Get() async list(@Req() r: { user: { role: Role; siteIds?: string[] } }) {
    return { success: true, data: await this.service.list(this.scope(r.user)) };
  }
  @Get(':id') async get(@Param('id', MongoIdPipe) id: string, @Req() r: { user: { role: Role; siteIds?: string[] } }) {
    this.assertSite(r.user, id);
    return { success: true, data: await this.service.get(id) };
  }
  @Patch(':id') async update(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: UpdateSiteDto,
    @Req() r: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    this.assertSite(r.user, id);
    return {
      success: true,
      data: await this.service.update(id, d, r.user.sub),
    };
  }
  @Patch(':id/status') async status(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: SiteStatusDto,
    @Req() r: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    this.assertSite(r.user, id);
    return {
      success: true,
      data: await this.service.status(id, d, r.user.sub),
    };
  }
  @Get(':id/domains') async domains(@Param('id', MongoIdPipe) id: string, @Req() r: { user: { role: Role; siteIds?: string[] } }) {
    this.assertSite(r.user, id);
    return { success: true, data: await this.service.listDomains(id) };
  }
  @Post(':id/domains') async addDomain(
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: CreateSiteDomainDto,
    @Req() request: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    this.assertSite(request.user, id);
    return {
      success: true,
      data: await this.service.addDomain(id, dto, request.user.sub),
    };
  }
  @Patch(':id/domains/:domainId') async updateDomain(
    @Param('id', MongoIdPipe) id: string,
    @Param('domainId', MongoIdPipe) domainId: string,
    @Body() dto: UpdateSiteDomainDto,
    @Req() request: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    this.assertSite(request.user, id);
    return {
      success: true,
      data: await this.service.updateDomain(
        id,
        domainId,
        dto,
        request.user.sub,
      ),
    };
  }
}
