import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SitesService } from '../sites/sites.service';
import { requestHostname } from '../sites/utils/request-hostname';
import { PropertiesService } from './properties.service';
import {
  AvailabilityQueryDto,
  PublicPropertyQueryDto,
} from './dto/property.dto';

@ApiTags('Public properties')
@Controller('properties')
export class PublicPropertiesController {
  constructor(
    private readonly properties: PropertiesService,
    private readonly sites: SitesService,
  ) {}

  @Get()
  async list(@Req() request: Request, @Query() query: PublicPropertyQueryDto) {
    const site = await this.sites.resolveActiveByDomain(
      requestHostname(request),
    );
    return {
      success: true,
      siteId: String(site._id),
      ...(await this.properties.listPublic(String(site._id), query)),
    };
  }

  @Get(':slug/availability')
  async availability(
    @Param('slug') slug: string,
    @Query() query: AvailabilityQueryDto,
    @Req() request: Request,
  ) {
    const site = await this.sites.resolveActiveByDomain(
      requestHostname(request),
    );
    return {
      success: true,
      siteId: String(site._id),
      data: await this.properties.publicAvailability(
        String(site._id),
        slug,
        query,
      ),
    };
  }

  @Get(':slug')
  async get(@Param('slug') slug: string, @Req() request: Request) {
    const site = await this.sites.resolveActiveByDomain(
      requestHostname(request),
    );
    return {
      success: true,
      siteId: String(site._id),
      data: await this.properties.getPublicBySlug(String(site._id), slug),
    };
  }
}
