import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';
import {
  PlatformSetting,
  PlatformSettingSchema,
} from './schemas/platform-setting.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformSetting.name, schema: PlatformSettingSchema },
    ]),
  ],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
