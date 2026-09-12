import {
  BadGatewayException,
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
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { Role } from '../common/enums/role.enum';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { Customer } from './schemas/customer.schema';
import { CustomerOtp } from './schemas/customer-otp.schema';
import {
  AddCoTravellerDto,
  ChangeCustomerPasswordDto,
  CompleteCustomerRegistrationDto,
  CustomerLoginDto,
  RegisterCustomerDto,
  RequestCustomerAccessDto,
  RequestCustomerOtpDto,
  ResetCustomerPasswordDto,
  UpdateCustomerDto,
  VerifyCustomerOtpDto,
} from './dto/customer.dto';

type Purpose = 'register' | 'login' | 'forgot-password';
@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private model: Model<Customer>,
    @InjectModel(CustomerOtp.name) private otps: Model<CustomerOtp>,
    private jwt: JwtService,
    private settings: PlatformSettingsService,
  ) {}
  private phone(value: string) {
    const digits = value.replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    if (phone.length < 11 || phone.length > 15)
      throw new BadRequestException('Enter a valid mobile number');
    return phone;
  }
  private hashOtp(phone: string, purpose: Purpose, code: string) {
    return createHash('sha256')
      .update(`${phone}:${purpose}:${code}`)
      .digest('hex');
  }
  private validPassword(value: string) {
    return (
      value.length >= 8 &&
      /[A-Za-z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  }

  async requestAccessOtp(dto: RequestCustomerAccessDto) {
    const phone = this.phone(dto.phone);
    const customer = await this.model
      .findOne({ phone, active: true })
      .select('+passwordHash')
      .lean();
    const purpose: Purpose = customer ? 'login' : 'register';
    const result = await this.requestOtp({ phone, purpose });
    return {
      ...result,
      purpose,
      existingAccount: Boolean(customer),
      passwordAvailable: Boolean(customer?.passwordHash),
    };
  }

  async requestOtp(dto: RequestCustomerOtpDto) {
    const phone = this.phone(dto.phone);
    const customer = await this.model
      .findOne({ phone })
      .select('_id active')
      .lean();
    if (dto.purpose === 'register' && customer)
      throw new ConflictException(
        'An account already exists for this mobile number',
      );
    if (dto.purpose !== 'register' && (!customer || !customer.active))
      throw new NotFoundException(
        'No active account was found for this mobile number',
      );
    if (
      await this.otps.exists({
        phone,
        purpose: dto.purpose,
        createdAt: { $gte: new Date(Date.now() - 60_000) },
      })
    )
      throw new BadRequestException(
        'Please wait 60 seconds before requesting another OTP',
      );
    const code = String(randomInt(100000, 1000000));
    await this.otps.updateMany(
      { phone, purpose: dto.purpose, used: false },
      { $set: { used: true } },
    );
    const record = await this.otps.create({
      phone,
      purpose: dto.purpose,
      codeHash: this.hashOtp(phone, dto.purpose, code),
      expiresAt: new Date(Date.now() + 600_000),
    });
    try {
      await this.sendWhatsAppOtp(phone, code);
    } catch (error) {
      await record.deleteOne();
      throw error;
    }
    return {
      phone: `+${phone.slice(0, 2)} ••••••${phone.slice(-4)}`,
      expiresIn: 600,
      resendAfter: 60,
    };
  }
  private async sendWhatsAppOtp(phone: string, code: string) {
    const config = await this.settings.aiSensy(true);
    if (!config.apiUrl || !config.apiKey || !config.otpCampaign)
      throw new BadGatewayException(
        'WhatsApp OTP is not configured. Contact support.',
      );
    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          campaignName: config.otpCampaign,
          destination: `+${phone}`,
          userName: 'Customer',
          templateParams: [code],
          // Authentication templates require the same OTP for their dynamic
          // Copy Code URL button; omitting this causes Meta error #131008.
          buttons: [
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
          source: 'customer-auth',
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || body.success === false)
        throw new Error(body.message || `AiSensy returned ${response.status}`);
    } catch (error) {
      throw new BadGatewayException(
        error instanceof Error
          ? `Unable to send WhatsApp OTP: ${error.message}`
          : 'Unable to send WhatsApp OTP',
      );
    }
  }
  async verifyOtp(dto: VerifyCustomerOtpDto) {
    const phone = this.phone(dto.phone);
    const record = await this.otps
      .findOne({ phone, purpose: dto.purpose, used: false })
      .sort({ createdAt: -1 })
      .select('+codeHash');
    if (!record || record.expiresAt.getTime() < Date.now())
      throw new UnauthorizedException('OTP has expired. Request a new code.');
    if (record.attempts >= 5)
      throw new UnauthorizedException(
        'Too many incorrect attempts. Request a new code.',
      );
    if (record.codeHash !== this.hashOtp(phone, dto.purpose, dto.otp)) {
      record.attempts += 1;
      await record.save();
      throw new UnauthorizedException('The verification code is incorrect');
    }
    record.used = true;
    await record.save();
    if (dto.purpose === 'login') {
      const customer = await this.model.findOne({ phone, active: true });
      if (!customer) throw new NotFoundException('Customer account not found');
      return { mode: 'session', ...(await this.session(customer)) };
    }
    return {
      mode:
        dto.purpose === 'register' ? 'complete-registration' : 'reset-password',
      verificationToken: await this.jwt.signAsync(
        { phone, flow: dto.purpose },
        { expiresIn: '15m' },
      ),
    };
  }
  async completeRegistration(
    dto: CompleteCustomerRegistrationDto,
    siteId?: string,
  ) {
    if (!dto.acceptTerms)
      throw new BadRequestException(
        'You must accept the terms and privacy policy',
      );
    let payload: { phone: string; flow: string };
    try {
      payload = await this.jwt.verifyAsync(dto.verificationToken);
    } catch {
      throw new UnauthorizedException('Registration verification has expired');
    }
    if (payload.flow !== 'register')
      throw new UnauthorizedException('Invalid registration verification');
    if (dto.password && !this.validPassword(dto.password))
      throw new BadRequestException(
        'Password must contain a letter, number and special character',
      );
    if (await this.model.exists({ phone: payload.phone }))
      throw new ConflictException(
        'An account already exists for this mobile number',
      );
    const email = dto.email?.trim().toLowerCase();
    if (email && (await this.model.exists({ email })))
      throw new ConflictException('An account already exists for this email');
    const customer = await this.model.create({
      name: dto.name?.trim() || 'Guest',
      email: email || undefined,
      phone: payload.phone,
      passwordHash: dto.password ? await bcrypt.hash(dto.password, 12) : '',
      role: Role.CUSTOMER,
      registeredFromSiteId: siteId ? new Types.ObjectId(siteId) : undefined,
    });
    return this.session(customer);
  }
  async resetPassword(dto: ResetCustomerPasswordDto) {
    if (!this.validPassword(dto.newPassword))
      throw new BadRequestException(
        'Password must contain a letter, number and special character',
      );
    let payload: { phone: string; flow: string };
    try {
      payload = await this.jwt.verifyAsync(dto.resetToken);
    } catch {
      throw new UnauthorizedException(
        'Password reset verification has expired',
      );
    }
    if (payload.flow !== 'forgot-password')
      throw new UnauthorizedException('Invalid password reset verification');
    const customer = await this.model
      .findOne({ phone: payload.phone, active: true })
      .select('+passwordHash');
    if (!customer) throw new NotFoundException('Customer account not found');
    customer.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    customer.sessions = [];
    await customer.save();
    return { changed: true };
  }
  async register(dto: RegisterCustomerDto, siteId?: string) {
    if (await this.model.exists({ email: dto.email.trim().toLowerCase() }))
      throw new ConflictException(
        'A customer account already exists for this email',
      );
    if (!dto.acceptTerms || !dto.phone)
      throw new BadRequestException(
        'Mobile number and terms acceptance are required',
      );
    const customer = await this.model.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: this.phone(dto.phone),
      passwordHash: await bcrypt.hash(dto.password, 12),
      role: Role.CUSTOMER,
      registeredFromSiteId: siteId ? new Types.ObjectId(siteId) : undefined,
    });
    return this.session(customer);
  }
  async login(dto: CustomerLoginDto) {
    const identifier = (dto.identifier || dto.email || '').trim().toLowerCase();
    if (!identifier)
      throw new UnauthorizedException('Invalid customer credentials');
    const filter = identifier.includes('@')
      ? { email: identifier }
      : { phone: this.phone(identifier) };
    const customer = await this.model
      .findOne({ ...filter, active: true })
      .select('+passwordHash');
    if (
      !customer?.passwordHash ||
      !(await bcrypt.compare(dto.password, customer.passwordHash))
    )
      throw new UnauthorizedException('Invalid customer credentials');
    return this.session(customer);
  }
  async me(id: string) {
    const customer = await this.model.findById(id).lean();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
  async ensureAccess(id: string) {
    if (!(await this.model.exists({ _id: id, active: true })))
      throw new UnauthorizedException('Customer account is not available');
  }
  async update(id: string, dto: UpdateCustomerDto) {
    const set: Record<string, unknown> = { ...dto };
    delete set.phone;
    if (dto.email) set.email = dto.email.trim().toLowerCase();
    const customer = await this.model
      .findByIdAndUpdate(id, { $set: set }, { new: true, runValidators: true })
      .lean();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
  async updateAvatar(id: string, avatarUrl: string) {
    const customer = await this.model
      .findByIdAndUpdate(
        id,
        { $set: { avatarUrl } },
        { new: true, runValidators: true },
      )
      .lean();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
  async changePassword(id: string, dto: ChangeCustomerPasswordDto) {
    if (!this.validPassword(dto.newPassword))
      throw new BadRequestException(
        'Password must contain a letter, number and special character',
      );
    const customer = await this.model.findById(id).select('+passwordHash');
    if (!customer) throw new NotFoundException('Customer not found');
    if (
      !customer.passwordHash ||
      !(await bcrypt.compare(dto.currentPassword, customer.passwordHash))
    )
      throw new UnauthorizedException('Current password is incorrect');
    customer.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await customer.save();
  }
  async sessions(id: string) {
    return (
      (await this.model.findById(id).select('sessions').lean())?.sessions || []
    );
  }
  async revokeSessions(id: string) {
    await this.model.updateOne({ _id: id }, { $set: { sessions: [] } });
  }
  async addTraveller(id: string, dto: AddCoTravellerDto) {
    const traveller = { id: randomUUID(), ...dto, createdAt: new Date() };
    await this.model.updateOne(
      { _id: id },
      { $push: { coTravellers: traveller } },
    );
    return traveller;
  }
  async removeTraveller(id: string, travellerId: string) {
    await this.model.updateOne(
      { _id: id },
      { $pull: { coTravellers: { id: travellerId } } },
    );
  }
  private async session(
    customer: Customer & { _id: Types.ObjectId; save: () => Promise<unknown> },
  ) {
    const sessionId = randomUUID();
    const now = new Date();
    customer.lastLoginAt = now;
    customer.sessions = [
      ...(customer.sessions || []).slice(-9),
      {
        id: sessionId,
        device: 'Web browser',
        createdAt: now,
        lastActiveAt: now,
      },
    ];
    await customer.save();
    return {
      accessToken: await this.jwt.signAsync({
        sub: String(customer._id),
        role: Role.CUSTOMER,
        sid: sessionId,
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
