import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
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
  @Get() async list(@Query() q: OwnerQueryDto) {
    return { success: true, data: await this.s.list(q) };
  }
  @Get(':id') async get(@Param('id', MongoIdPipe) id: string) {
    return { success: true, data: await this.s.get(id) };
  }
  @Patch(':id/status') async status(
    @Param('id', MongoIdPipe) id: string,
    @Body() d: OwnerStatusDto,
    @Req() r: { user: { sub: string } },
  ) {
    return {
      success: true,
      data: await this.s.status(id, d.status, r.user.sub),
    };
  }
}
