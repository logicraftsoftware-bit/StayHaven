import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Admin } from '../admins/schemas/admin.schema';
import { Role } from '../common/enums/role.enum';
import {
  UpdateAdminBrandingDto,
  UpdateMapSettingsDto,
  UpdateRazorpaySettingsDto,
} from './dto/platform-setting.dto';
import { PlatformSetting } from './schemas/platform-setting.schema';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectModel(PlatformSetting.name)
    private readonly settings: Model<PlatformSetting>,
    @InjectModel(Admin.name)
    private readonly admins: Model<Admin>,
    private readonly config: ConfigService,
  ) {}

  async adminBranding() {
    const value = await this.settings.findOne({ key: 'admin-branding' }).lean();
    if (value?.panelLogo) return { panelLogo: value.panelLogo };

    // Seamlessly migrate the previously account-scoped Super Admin logo.
    const legacy = await this.admins
      .findOne({ role: Role.SUPER_ADMIN, panelLogo: { $nin: [null, ''] } })
      .select('panelLogo')
      .lean();
    const panelLogo = legacy?.panelLogo || '';
    if (panelLogo) await this.updateAdminBranding({ panelLogo });
    return { panelLogo };
  }

  async updateAdminBranding(dto: UpdateAdminBrandingDto) {
    const panelLogo = dto.panelLogo?.trim() || '';
    return this.settings
      .findOneAndUpdate(
        { key: 'admin-branding' },
        { $set: { panelLogo }, $setOnInsert: { key: 'admin-branding' } },
        { new: true, upsert: true, runValidators: true },
      )
      .lean();
  }

  async maps() {
    const value = await this.settings.findOne({ key: 'maps' }).lean();
    return { googleMapsBrowserKey: value?.googleMapsBrowserKey || '' };
  }

  async updateMaps(dto: UpdateMapSettingsDto) {
    const googleMapsBrowserKey = dto.googleMapsBrowserKey?.trim() || '';
    return this.settings
      .findOneAndUpdate(
        { key: 'maps' },
        { $set: { googleMapsBrowserKey }, $setOnInsert: { key: 'maps' } },
        { new: true, upsert: true, runValidators: true },
      )
      .lean();
  }

  private crypt(value: string, decode = false) {
    if (!value) return '';
    const key = createHash('sha256')
      .update(this.config.getOrThrow<string>('jwt.secret'))
      .digest();
    if (decode) {
      try {
        const [ivHex, tagHex, encrypted] = value.split(':');
        const decipher = createDecipheriv(
          'aes-256-gcm',
          key,
          Buffer.from(ivHex, 'hex'),
        );
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
        return Buffer.concat([
          decipher.update(Buffer.from(encrypted, 'base64')),
          decipher.final(),
        ]).toString('utf8');
      } catch {
        return '';
      }
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('base64')}`;
  }

  async razorpay(includeSecrets = false) {
    const value = await this.settings
      .findOne({ key: 'razorpay' })
      .select(
        '+razorpayKeyId +razorpayKeySecret +razorpayWebhookSecret +razorpayXAccountNumber',
      )
      .lean();
    const settings = {
      keyId: this.crypt(value?.razorpayKeyId || '', true),
      keySecret: this.crypt(value?.razorpayKeySecret || '', true),
      webhookSecret: this.crypt(value?.razorpayWebhookSecret || '', true),
      accountNumber: this.crypt(value?.razorpayXAccountNumber || '', true),
      liveMode: Boolean(value?.razorpayLiveMode),
      minimumWithdrawalAmount: Number(value?.minimumWithdrawalAmount || 1000),
    };
    if (includeSecrets) return settings;
    return {
      keyId: settings.keyId,
      keySecretConfigured: Boolean(settings.keySecret),
      webhookSecretConfigured: Boolean(settings.webhookSecret),
      accountNumber: settings.accountNumber
        ? `••••${settings.accountNumber.slice(-4)}`
        : '',
      accountNumberConfigured: Boolean(settings.accountNumber),
      liveMode: settings.liveMode,
      minimumWithdrawalAmount: settings.minimumWithdrawalAmount,
      gatewayReady: Boolean(
        settings.keyId && settings.keySecret && settings.webhookSecret,
      ),
      payoutsReady: Boolean(
        settings.keyId && settings.keySecret && settings.accountNumber,
      ),
    };
  }

  async updateRazorpay(dto: UpdateRazorpaySettingsDto) {
    const current = await this.razorpay(true);
    const set: Record<string, unknown> = {
      razorpayLiveMode: dto.liveMode ?? current.liveMode,
      minimumWithdrawalAmount:
        dto.minimumWithdrawalAmount ?? current.minimumWithdrawalAmount,
    };
    if (dto.keyId !== undefined)
      set.razorpayKeyId = this.crypt(dto.keyId.trim());
    if (dto.keySecret !== undefined && dto.keySecret !== '')
      set.razorpayKeySecret = this.crypt(dto.keySecret.trim());
    if (dto.webhookSecret !== undefined && dto.webhookSecret !== '')
      set.razorpayWebhookSecret = this.crypt(dto.webhookSecret.trim());
    if (dto.accountNumber !== undefined && dto.accountNumber !== '')
      set.razorpayXAccountNumber = this.crypt(dto.accountNumber.trim());
    await this.settings.findOneAndUpdate(
      { key: 'razorpay' },
      { $set: set, $setOnInsert: { key: 'razorpay' } },
      { upsert: true, runValidators: true },
    );
    return this.razorpay(false);
  }
}
