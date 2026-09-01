import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { OwnerStatus, PropertyStatus } from '../common/enums/status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OwnersService } from '../owners/owners.service';
import { PropertiesService } from '../properties/properties.service';
import { SitesService } from '../sites/sites.service';
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class DashboardController {
  constructor(
    private properties: PropertiesService,
    private owners: OwnersService,
    private sites: SitesService,
  ) {}
  @Get() async dashboard(@Req() request: { user: { role: Role; siteIds?: string[] } }) {
    const siteIds = request.user.role === Role.SUPER_ADMIN ? undefined : (request.user.siteIds || []);
    const [
      totalProperties,
      pendingProperties,
      approvedProperties,
      rejectedProperties,
      totalOwners,
      activeOwners,
      suspendedOwners,
      totalSites,
    ] = await Promise.all([
      this.properties.count(undefined, siteIds),
      this.properties.count(PropertyStatus.PENDING, siteIds),
      this.properties.count(PropertyStatus.APPROVED, siteIds),
      this.properties.count(PropertyStatus.REJECTED, siteIds),
      this.owners.count(undefined, siteIds),
      this.owners.count(OwnerStatus.ACTIVE, siteIds),
      this.owners.count(OwnerStatus.SUSPENDED, siteIds),
      this.sites.count(siteIds),
    ]);
    return {
      success: true,
      data: {
        totalProperties,
        pendingProperties,
        approvedProperties,
        rejectedProperties,
        totalOwners,
        activeOwners,
        suspendedOwners,
        totalCustomers: 0,
        totalSites,
      },
    };
  }
}
