import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

export type MediaKind = 'image' | 'video' | 'raw';

@Injectable()
export class MediaService {
  private readonly cloudinaryEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('cloudinary.cloudName');
    const apiKey = this.config.get<string>('cloudinary.apiKey');
    const apiSecret = this.config.get<string>('cloudinary.apiSecret');
    this.cloudinaryEnabled = Boolean(cloudName && apiKey && apiSecret);
    if (this.cloudinaryEnabled) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  async upload(
    buffer: Buffer,
    kind: MediaKind,
    extension: string,
    subfolder = 'site-media',
  ) {
    if (this.cloudinaryEnabled)
      return this.uploadToCloudinary(buffer, kind, subfolder);

    const directory = join(
      this.config.getOrThrow<string>('uploadDir'),
      subfolder,
    );
    await mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    await writeFile(join(directory, filename), buffer, { flag: 'wx' });
    return {
      url: `/api/uploads/${subfolder}/${filename}`,
      storage: 'local' as const,
    };
  }

  private uploadToCloudinary(
    buffer: Buffer,
    kind: MediaKind,
    subfolder: string,
  ): Promise<{ url: string; publicId: string; storage: 'cloudinary' }> {
    const folder = this.config.get<string>('cloudinary.folder') || 'stayhaven';
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: kind,
          folder: `${folder}/${subfolder}`,
          asset_folder: `${folder}/${subfolder}`,
          use_filename: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            const reason =
              error instanceof Error
                ? error
                : new Error(error?.message || 'Cloudinary upload failed');
            return reject(reason);
          }
          const uploaded = result;
          resolve({
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            storage: 'cloudinary',
          });
        },
      );
      stream.end(buffer);
    });
  }
}
