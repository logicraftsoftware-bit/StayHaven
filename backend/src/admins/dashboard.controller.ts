import { Controller, Get, UseGuards } from '@nestjs/common';
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
  @Get() async dashboard() {
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
      this.properties.count(),
      this.properties.count(PropertyStatus.PENDING),
      this.properties.count(PropertyStatus.APPROVED),
      this.properties.count(PropertyStatus.REJECTED),
      this.owners.count(),
      this.owners.count(OwnerStatus.ACTIVE),
      this.owners.count(OwnerStatus.SUSPENDED),
      this.sites.count(),
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
