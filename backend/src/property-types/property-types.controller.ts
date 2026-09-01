import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import {
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
} from './dto/property-type.dto';
import { PropertyTypesService } from './property-types.service';

@ApiTags('Property types')
@Controller()
export class PropertyTypesController {
  constructor(private service: PropertyTypesService) {}
  @Get('property-types') async active() {
    return { success: true, data: await this.service.listActive() };
  }
  @Get('admin/property-types')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async admin() {
    return { success: true, data: await this.service.listAdmin() };
  }
  @Post('admin/property-types')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() dto: CreatePropertyTypeDto) {
    return { success: true, data: await this.service.create(dto) };
  }
  @Patch('admin/property-types/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async update(
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: UpdatePropertyTypeDto,
  ) {
    return { success: true, data: await this.service.update(id, dto) };
  }
}
