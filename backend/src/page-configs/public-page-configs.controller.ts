import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { requestHostname } from '../sites/utils/request-hostname';
import { PageConfigsService } from './page-configs.service';
@ApiTags('Public page configuration')
@Controller('sites/current/pages')
export class PublicPageConfigsController {
  constructor(private service: PageConfigsService) {}
  @Get(':page') async get(
    @Param('page') page: string,
    @Req() request: Request,
  ) {
    return {
      success: true,
      data: await this.service.getPublishedByHostname(
        requestHostname(request),
        page,
      ),
    };
  }
}
