import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin } from '../admins/schemas/admin.schema';
import { Role } from '../common/enums/role.enum';
import {
  UpdateAdminBrandingDto,
  UpdateMapSettingsDto,
} from './dto/platform-setting.dto';
import { PlatformSetting } from './schemas/platform-setting.schema';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectModel(PlatformSetting.name)
    private readonly settings: Model<PlatformSetting>,
    @InjectModel(Admin.name)
    private readonly admins: Model<Admin>,
  ) {}

  async adminBranding() {
    const value = await this.settings
      .findOne({ key: 'admin-branding' })
      .lean();
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
}
