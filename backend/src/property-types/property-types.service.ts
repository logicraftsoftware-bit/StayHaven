import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
} from './dto/property-type.dto';
import { PropertyType } from './schemas/property-type.schema';

@Injectable()
export class PropertyTypesService {
  constructor(
    @InjectModel(PropertyType.name) private model: Model<PropertyType>,
  ) {}
  listAdmin() {
    return this.model
      .find()
      .select('+commissionPercent')
      .sort({ sortOrder: 1, name: 1 })
      .lean();
  }
  listActive() {
    return this.model
      .find({ status: 'active' })
      .select('name slug image description sortOrder')
      .sort({ sortOrder: 1, name: 1 })
      .lean();
  }
  async getActive(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid property type');
    const value = await this.model.findOne({ _id: id, status: 'active' });
    if (!value) throw new NotFoundException('Active property type not found');
    return value;
  }
  create(dto: CreatePropertyTypeDto) {
    const slug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.model.create({ ...dto, slug });
  }
  async update(id: string, dto: UpdatePropertyTypeDto) {
    const update: Record<string, unknown> = { ...dto };
    if (dto.name)
      update.slug = dto.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const value = await this.model
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select('+commissionPercent');
    if (!value) throw new NotFoundException('Property type not found');
    return value;
  }
}
