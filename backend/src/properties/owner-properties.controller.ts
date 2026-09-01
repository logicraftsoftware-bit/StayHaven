import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { SitesService } from '../sites/sites.service';
import { requestHostname } from '../sites/utils/request-hostname';
import { OwnerStatusGuard } from '../owners/owner-status.guard';
import {
  CreateOwnerPropertyDto,
  OwnerPropertyQueryDto,
  UpdateOwnerPropertyDto,
} from './dto/property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('Owner properties')
@ApiBearerAuth()
@Controller('owner/properties')
@UseGuards(JwtAuthGuard, RolesGuard, OwnerStatusGuard)
@Roles(Role.HOTEL_OWNER)
export class OwnerPropertiesController {
  constructor(
    private properties: PropertiesService,
    private sites: SitesService,
  ) {}

  @Get()
  async list(
    @Req() req: { user: { sub: string } },
    @Query() query: OwnerPropertyQueryDto,
  ) {
    return {
      success: true,
      data: await this.properties.listOwner(req.user.sub, query),
    };
  }

  @Get('summary')
  async summary(@Req() req: { user: { sub: string } }) {
    return {
      success: true,
      data: await this.properties.ownerSummary(req.user.sub),
    };
  }

  @Post()
  async create(
    @Body() dto: CreateOwnerPropertyDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const currentSiteId = dto.siteId
      ? undefined
      : String(
          (await this.sites.resolveActiveByDomain(requestHostname(req)))._id,
        );
    return {
      success: true,
      message: dto.submit ? 'Property submitted for review' : 'Draft saved',
      data: await this.properties.createOwner(req.user.sub, dto, currentSiteId),
    };
  }

  @Get(':id')
  async get(
    @Param('id', MongoIdPipe) id: string,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.properties.getOwnerView(req.user.sub, id),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateOwnerPropertyDto,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.properties.updateOwner(req.user.sub, id, dto),
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', MongoIdPipe) id: string,
    @Req() req: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.properties.deleteOwner(req.user.sub, id),
    };
  }
}
