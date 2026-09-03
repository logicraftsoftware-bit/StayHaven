import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';
import { Customer } from './schemas/customer.schema';
import {
  ChangeCustomerPasswordDto,
  CustomerLoginDto,
  RegisterCustomerDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private model: Model<Customer>,
    private jwt: JwtService,
  ) {}
  async register(dto: RegisterCustomerDto, siteId?: string) {
    if (!dto.acceptTerms)
      throw new BadRequestException('You must accept the terms');
    const email = dto.email.trim().toLowerCase();
    if (await this.model.exists({ email }))
      throw new ConflictException(
        'A customer account already exists for this email',
      );
    try {
      const customer = await this.model.create({
        name: dto.name.trim(),
        email,
        phone: dto.phone?.trim(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: Role.CUSTOMER,
        registeredFromSiteId: siteId ? new Types.ObjectId(siteId) : undefined,
      });
      return this.session(customer);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        (error as { code?: unknown }).code === 11000
      )
        throw new ConflictException(
          'A customer account already exists for this email',
        );
      throw error;
    }
  }
  async login(dto: CustomerLoginDto) {
    const customer = await this.model
      .findOne({ email: dto.email.trim().toLowerCase(), active: true })
      .select('+passwordHash');
    if (
      !customer ||
      !(await bcrypt.compare(dto.password, customer.passwordHash))
    )
      throw new UnauthorizedException('Invalid customer credentials');
    customer.lastLoginAt = new Date();
    await customer.save();
    return this.session(customer);
  }
  async me(id: string) {
    const customer = await this.model.findById(id).lean();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
  async ensureAccess(id: string) {
    const customer = await this.model
      .findOne({ _id: id, active: true })
      .select('_id')
      .lean();
    if (!customer)
      throw new UnauthorizedException('Customer account is not available');
  }
  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
  async changePassword(id: string, dto: ChangeCustomerPasswordDto) {
    const customer = await this.model.findById(id).select('+passwordHash');
    if (!customer) throw new NotFoundException('Customer not found');
    if (!(await bcrypt.compare(dto.currentPassword, customer.passwordHash)))
      throw new UnauthorizedException('Current password is incorrect');
    customer.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await customer.save();
  }
  private async session(customer: Customer & { _id: Types.ObjectId }) {
    return {
      accessToken: await this.jwt.signAsync({
        sub: String(customer._id),
        role: Role.CUSTOMER,
      }),
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: Role.CUSTOMER,
        createdAt: customer.createdAt,
      },
    };
  }
}
