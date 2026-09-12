import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { createHash, randomInt } from 'node:crypto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../common/enums/role.enum';
import { OwnerStatus } from '../common/enums/status.enum';
import { OwnerQueryDto } from './dto/owner.dto';
import { Owner } from './schemas/owner.schema';
import { OwnerOtp } from './schemas/owner-otp.schema';
import * as bcrypt from 'bcrypt';
import { SitesService } from '../sites/sites.service';
import {
  ChangeOwnerPasswordDto,
  CompleteOwnerRegistrationDto,
  OwnerLoginDto,
  RegisterOwnerDto,
  RequestOwnerOtpDto,
  ResetOwnerPasswordDto,
  UpdateOwnerProfileDto,
  VerifyOwnerOtpDto,
} from './dto/owner-account.dto';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';

type OwnerOtpPurpose = 'register' | 'login' | 'forgot-password';

type OwnerAdminDetail = Owner & {
  _id: Types.ObjectId;
  properties: Array<Record<string, unknown>>;
  sites: Array<{ _id: Types.ObjectId; name: string }>;
  auditHistory: Awaited<ReturnType<AuditLogsService['history']>>;
};

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
@Injectable()
export class OwnersService {
  constructor(
    @InjectModel(Owner.name) private model: Model<Owner>,
    private audit: AuditLogsService,
    private jwt: JwtService,
    private sites: SitesService,
    @InjectModel(OwnerOtp.name) private otps: Model<OwnerOtp>,
    private settings: PlatformSettingsService,
  ) {}

  private phone(value: string) {
    const digits = value.replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    if (phone.length < 11 || phone.length > 15)
      throw new BadRequestException('Enter a valid mobile number');
    return phone;
  }

  private phoneCandidates(value: string) {
    const normalized = this.phone(value);
    return [
      normalized,
      `+${normalized}`,
      normalized.startsWith('91') ? normalized.slice(2) : normalized,
    ];
  }

  private hashOtp(phone: string, purpose: OwnerOtpPurpose, code: string) {
    return createHash('sha256')
      .update(`${phone}:owner:${purpose}:${code}`)
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
  async list(q: OwnerQueryDto, allowedSiteIds?: string[]) {
    const match: Record<string, unknown> = {};
    if (q.status) match.status = q.status;
    if (q.search)
      match.$or = [
        { name: { $regex: q.search, $options: 'i' } },
        { email: { $regex: q.search, $options: 'i' } },
      ];
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'gw_properties',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'properties',
        },
      },
    ];
    if (q.siteId)
      pipeline.push({
        $match: {
          properties: { $elemMatch: { siteId: new Types.ObjectId(q.siteId) } },
        },
      });
    else if (allowedSiteIds)
      pipeline.push({
        $match: {
          properties: {
            $elemMatch: {
              siteId: {
                $in: allowedSiteIds.map((id) => new Types.ObjectId(id)),
              },
            },
          },
        },
      });
    pipeline.push(
      {
        $addFields: {
          propertyCount: { $size: '$properties' },
          siteIds: { $setUnion: ['$properties.siteId', []] },
        },
      },
      { $project: { passwordHash: 0, properties: 0 } },
      { $sort: { createdAt: -1 } },
    );
    return this.model.aggregate(pipeline);
  }
  async get(id: string): Promise<OwnerAdminDetail> {
    const [owner] = await this.model.aggregate<
      Omit<OwnerAdminDetail, 'auditHistory'>
    >([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'gw_properties',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'properties',
        },
      },
      {
        $lookup: {
          from: 'gw_sites',
          localField: 'properties.siteId',
          foreignField: '_id',
          as: 'sites',
        },
      },
      {
        $project: {
          passwordHash: 0,
          'properties.ownerId': 0,
          'sites.domains': 0,
          'sites.theme': 0,
          'sites.seo': 0,
        },
      },
    ]);
    if (!owner) throw new NotFoundException('Owner not found');
    return {
      ...owner,
      auditHistory: await this.audit.history('OWNER', id),
    };
  }
  async status(id: string, status: OwnerStatus, actor: string) {
    const owner = await this.model.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!owner) throw new NotFoundException('Owner not found');
    await this.audit.record({
      actorId: new Types.ObjectId(actor),
      actorRole: Role.SUPER_ADMIN,
      action: 'OWNER_STATUS_CHANGED',
      entityType: 'OWNER',
      entityId: owner._id,
      metadata: { status },
    });
    return owner;
  }
  async count(status?: OwnerStatus, siteIds?: string[]) {
    if (!siteIds) return this.model.countDocuments(status ? { status } : {});
    const match: Record<string, unknown> = status ? { status } : {};
    const result = await this.model.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'gw_properties',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'properties',
        },
      },
      {
        $match: {
          properties: {
            $elemMatch: {
              siteId: { $in: siteIds.map((id) => new Types.ObjectId(id)) },
            },
          },
        },
      },
      { $count: 'total' },
    ]);
    return result[0]?.total || 0;
  }

  async ensureAccess(id: string) {
    const owner = await this.model.findById(id).select('status').lean();
    if (
      !owner ||
      [OwnerStatus.SUSPENDED, OwnerStatus.REJECTED].includes(owner.status)
    )
      throw new UnauthorizedException('Owner account is not available');
  }

  async requestOtp(dto: RequestOwnerOtpDto) {
    const phone = this.phone(dto.phone);
    const owner = await this.model
      .findOne({ phone: { $in: this.phoneCandidates(phone) } })
      .select('_id status')
      .lean();
    if (dto.purpose === 'register' && owner)
      throw new ConflictException(
        'An owner account already exists for this mobile number',
      );
    if (dto.purpose !== 'register' && !owner)
      throw new NotFoundException(
        'No owner account was found for this mobile number',
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
          userName: 'Hotel Owner',
          templateParams: [code],
          buttons: [
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
          source: 'owner-auth',
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

  async verifyOtp(dto: VerifyOwnerOtpDto) {
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
      const owner = await this.model.findOne({
        phone: { $in: this.phoneCandidates(phone) },
      });
      if (!owner) throw new NotFoundException('Owner account not found');
      if ([OwnerStatus.SUSPENDED, OwnerStatus.REJECTED].includes(owner.status))
        throw new UnauthorizedException('Owner account is not available');
      return { mode: 'session', ...(await this.session(owner)) };
    }
    return {
      mode:
        dto.purpose === 'register' ? 'complete-registration' : 'reset-password',
      verificationToken: await this.jwt.signAsync(
        { phone, flow: `owner-${dto.purpose}` },
        { expiresIn: '15m' },
      ),
    };
  }

  async completeRegistration(
    dto: CompleteOwnerRegistrationDto,
    context: { siteId?: string; ip?: string; userAgent?: string },
  ) {
    let payload: { phone: string; flow: string };
    try {
      payload = await this.jwt.verifyAsync(dto.verificationToken);
    } catch {
      throw new UnauthorizedException('Registration verification has expired');
    }
    if (payload.flow !== 'owner-register')
      throw new UnauthorizedException('Invalid registration verification');
    if (this.phone(dto.phone) !== payload.phone)
      throw new UnauthorizedException('Verified mobile number does not match');
    return this.register(dto, context);
  }

  async resetPassword(dto: ResetOwnerPasswordDto) {
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
    if (payload.flow !== 'owner-forgot-password')
      throw new UnauthorizedException('Invalid password reset verification');
    const owner = await this.model
      .findOne({ phone: { $in: this.phoneCandidates(payload.phone) } })
      .select('+passwordHash');
    if (!owner) throw new NotFoundException('Owner account not found');
    owner.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await owner.save();
    return { changed: true };
  }

  async register(
    dto: RegisterOwnerDto,
    context: { siteId?: string; ip?: string; userAgent?: string },
  ) {
    const email = dto.email.trim().toLowerCase();
    const phone = this.phone(dto.phone);
    if (await this.model.exists({ email }))
      throw new ConflictException(
        'An owner account already exists. Please log in.',
      );
    if (
      await this.model.exists({ phone: { $in: this.phoneCandidates(phone) } })
    )
      throw new ConflictException(
        'An owner account already exists. Please log in.',
      );
    const registeredFromSiteId = context.siteId
      ? new Types.ObjectId(context.siteId)
      : undefined;
    let owner: Owner & { _id: Types.ObjectId };
    try {
      owner = await this.model.create({
        name: dto.name.trim(),
        email,
        phone,
        businessName: dto.businessName?.trim(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: Role.HOTEL_OWNER,
        registeredFromSiteId,
      });
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictException(
          'An owner account already exists. Please log in.',
        );
      throw error;
    }
    await this.audit.record({
      actorId: owner._id,
      actorRole: Role.HOTEL_OWNER,
      action: 'OWNER_REGISTERED',
      entityType: 'OWNER',
      entityId: owner._id,
      siteId: registeredFromSiteId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
    return this.session(owner);
  }

  async login(
    dto: OwnerLoginDto,
    context: { ip?: string; userAgent?: string },
  ) {
    const identifier = (dto.identifier || dto.email || '').trim().toLowerCase();
    if (!identifier)
      throw new UnauthorizedException('Invalid owner credentials');
    const filter = identifier.includes('@')
      ? { email: identifier }
      : { phone: { $in: this.phoneCandidates(identifier) } };
    const owner = await this.model.findOne(filter).select('+passwordHash');
    if (
      !owner ||
      [OwnerStatus.SUSPENDED, OwnerStatus.REJECTED].includes(owner.status) ||
      !(await bcrypt.compare(dto.password, owner.passwordHash))
    )
      throw new UnauthorizedException('Invalid owner credentials');
    owner.lastLoginAt = new Date();
    await owner.save();
    await this.audit.record({
      actorId: owner._id,
      actorRole: Role.HOTEL_OWNER,
      action: 'OWNER_LOGIN',
      entityType: 'OWNER',
      entityId: owner._id,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
    return this.session(owner);
  }

  async me(id: string) {
    const owner = await this.model.findById(id).lean();
    if (!owner) throw new NotFoundException('Owner not found');
    return owner;
  }

  async updateProfile(id: string, dto: UpdateOwnerProfileDto) {
    const owner = await this.model.findByIdAndUpdate(id, dto, { new: true });
    if (!owner) throw new NotFoundException('Owner not found');
    await this.audit.record({
      actorId: owner._id,
      actorRole: Role.HOTEL_OWNER,
      action: 'OWNER_PROFILE_UPDATED',
      entityType: 'OWNER',
      entityId: owner._id,
    });
    return owner;
  }

  async changePassword(id: string, dto: ChangeOwnerPasswordDto) {
    const owner = await this.model.findById(id).select('+passwordHash');
    if (!owner) throw new NotFoundException('Owner not found');
    if (!(await bcrypt.compare(dto.currentPassword, owner.passwordHash)))
      throw new UnauthorizedException('Current password is incorrect');
    owner.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await owner.save();
    await this.audit.record({
      actorId: owner._id,
      actorRole: Role.HOTEL_OWNER,
      action: 'OWNER_PASSWORD_CHANGED',
      entityType: 'OWNER',
      entityId: owner._id,
    });
  }

  availableSites() {
    return this.sites.listActive();
  }

  private async session(owner: Owner & { _id: Types.ObjectId }) {
    const accessToken = await this.jwt.signAsync({
      sub: String(owner._id),
      role: Role.HOTEL_OWNER,
    });
    return {
      accessToken,
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        businessName: owner.businessName,
        status: owner.status,
        role: owner.role,
      },
    };
  }
}
