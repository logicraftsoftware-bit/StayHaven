import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
  OwnerInventoryQueryDto,
  UpdateOwnerInventoryDto,
} from './dto/property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('Owner properties')
@ApiBearerAuth()
@Controller('owner/properties')
@UseGuards(JwtAuthGuard, RolesGuard, OwnerStatusGuard)
@Roles(Role.HOTEL_OWNER, Role.TEAM_MEMBER)
export class OwnerPropertiesController {
  constructor(
    private properties: PropertiesService,
    private sites: SitesService,
  ) {}

  private ownerId(user: PortalUser) {
    return user.role === Role.TEAM_MEMBER ? user.ownerId || '' : user.sub;
  }

  private authorize(user: PortalUser, propertyId: string, permission: string) {
    if (user.role !== Role.TEAM_MEMBER) return;
    if (
      !user.propertyIds?.includes(propertyId) ||
      !user.permissions?.includes(permission)
    )
      throw new ForbiddenException(
        'You do not have permission to access this property area',
      );
  }

  @Get()
  async list(
    @Req() req: { user: PortalUser },
    @Query() query: OwnerPropertyQueryDto,
  ) {
    return {
      success: true,
      data: (
        await this.properties.listOwner(this.ownerId(req.user), query)
      ).filter(
        (property) =>
          req.user.role !== Role.TEAM_MEMBER ||
          req.user.propertyIds?.includes(String(property._id)),
      ),
    };
  }

  @Get('summary')
  async summary(@Req() req: { user: PortalUser }) {
    if (req.user.role === Role.TEAM_MEMBER)
      throw new ForbiddenException('Owner summary is not available');
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
    if ((req.user as PortalUser).role === Role.TEAM_MEMBER)
      throw new ForbiddenException('Only the owner can create properties');
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
    @Req() req: { user: PortalUser },
  ) {
    this.authorize(req.user, id, 'VIEW_PROPERTIES');
    return {
      success: true,
      data: await this.properties.getOwnerView(this.ownerId(req.user), id),
    };
  }

  @Get(':id/inventory')
  async inventory(
    @Param('id', MongoIdPipe) id: string,
    @Query() query: OwnerInventoryQueryDto,
    @Req() req: { user: PortalUser },
  ) {
    this.authorize(req.user, id, 'VIEW_RATES');
    return {
      success: true,
      data: await this.properties.getOwnerInventory(
        this.ownerId(req.user),
        id,
        query,
      ),
    };
  }

  @Patch(':id/inventory')
  async updateInventory(
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateOwnerInventoryDto,
    @Req() req: { user: PortalUser },
  ) {
    this.authorize(req.user, id, 'MANAGE_RATES');
    return {
      success: true,
      message: 'Rates and inventory updated',
      data: await this.properties.updateOwnerInventory(
        this.ownerId(req.user),
        id,
        dto,
      ),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdateOwnerPropertyDto,
    @Req() req: { user: PortalUser },
  ) {
    this.authorize(req.user, id, 'EDIT_PROPERTIES');
    return {
      success: true,
      data: await this.properties.updateOwner(this.ownerId(req.user), id, dto),
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', MongoIdPipe) id: string,
    @Req() req: { user: PortalUser },
  ) {
    if (req.user.role === Role.TEAM_MEMBER)
      throw new ForbiddenException('Only the owner can delete properties');
    return {
      success: true,
      data: await this.properties.deleteOwner(req.user.sub, id),
    };
  }
}

type PortalUser = {
  sub: string;
  role: Role;
  ownerId?: string;
  propertyIds?: string[];
  permissions?: string[];
};
