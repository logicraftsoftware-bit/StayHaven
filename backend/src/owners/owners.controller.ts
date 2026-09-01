import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
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
import { OwnerQueryDto, OwnerStatusDto } from './dto/owner.dto';
import { OwnersService } from './owners.service';
@ApiTags('Owners')
@ApiBearerAuth()
@Controller('admin/owners')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class OwnersController {
  constructor(private s: OwnersService) {}
  private scope(user: { role: Role; adminLevel?: string; siteIds?: string[] }) {
    return user.role === Role.SUPER_ADMIN || user.adminLevel === 'MAIN_ADMIN'
      ? undefined
      : user.siteIds || [];
  }
  private assertOwner(
    user: { role: Role; adminLevel?: string; siteIds?: string[] },
    owner: { properties?: Array<{ siteId?: unknown }> },
  ) {
    if (
      user.role !== Role.SUPER_ADMIN &&
      user.adminLevel !== 'MAIN_ADMIN' &&
      !owner.properties?.some((property) =>
        user.siteIds?.includes(String(property.siteId)),
      )
    )
      throw new ForbiddenException(
        'This owner does not belong to an assigned marketplace site',
      );
  }
  @Get() async list(
    @Query() q: OwnerQueryDto,
    @Req() r: { user: { role: Role; adminLevel?: string; siteIds?: string[] } },
  ) {
    if (
      q.siteId &&
      r.user.role !== Role.SUPER_ADMIN &&
      r.user.adminLevel !== 'MAIN_ADMIN' &&
      !r.user.siteIds?.includes(q.siteId)
    )
      throw new ForbiddenException(
        'This marketplace site is not assigned to your account',
      );
    return { success: true, data: await this.s.list(q, this.scope(r.user)) };
  }
  @Get(':id') async get(
    @Param('id', MongoIdPipe) id: string,
    @Req() r: { user: { role: Role; siteIds?: string[] } },
  ) {
    const data = await this.s.get(id);
    this.assertOwner(r.user, data);
    return { success: true, data };
  }
  @Patch(':id/status') async status(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: OwnerStatusDto,
    @Req() r: { user: { sub: string; role: Role; siteIds?: string[] } },
  ) {
    const owner = await this.s.get(id);
    this.assertOwner(r.user, owner);
    return {
      success: true,
      data: await this.s.status(id, d.status, r.user.sub),
    };
  }
}
