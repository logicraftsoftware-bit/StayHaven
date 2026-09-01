import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateMapSettingsDto } from './dto/platform-setting.dto';
import { PlatformSetting } from './schemas/platform-setting.schema';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectModel(PlatformSetting.name)
    private readonly settings: Model<PlatformSetting>,
  ) {}

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
