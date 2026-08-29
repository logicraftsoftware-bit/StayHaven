import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SitesService } from './sites.service';
import { requestHostname } from './utils/request-hostname';

@ApiTags('Public sites')
@Controller('sites')
export class PublicSitesController {
  constructor(private readonly sites: SitesService) {}

  @Get()
  async list() {
    return { success: true, data: await this.sites.listActive() };
  }

  @Get('current')
  async current(@Req() request: Request) {
    const hostname = requestHostname(request);
    return {
      success: true,
      hostname,
      data: await this.sites.resolveActiveByDomain(hostname),
    };
  }
}
