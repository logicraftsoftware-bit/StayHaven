import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const imageSignatures = [
  {
    extension: 'png',
    matches: (b: Buffer) =>
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    extension: 'jpg',
    matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    extension: 'gif',
    matches: (b: Buffer) =>
      ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii')),
  },
  {
    extension: 'webp',
    matches: (b: Buffer) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    extension: 'ico',
    matches: (b: Buffer) => b.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])),
  },
];

const videoSignatures = [
  {
    extension: 'mp4',
    matches: (b: Buffer) =>
      b.length >= 12 && b.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  {
    extension: 'webm',
    matches: (b: Buffer) =>
      b.length >= 4 &&
      b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  },
];

@ApiTags('Media')
@ApiBearerAuth()
@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class MediaController {
  constructor(private readonly config: ConfigService) {}

  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Select an image to upload');
    const format = imageSignatures.find((candidate) =>
      candidate.matches(file.buffer),
    );
    if (!format)
      throw new BadRequestException('Use a PNG, JPG, WEBP, GIF, or ICO image');

    const directory = join(
      this.config.getOrThrow<string>('uploadDir'),
      'site-media',
    );
    await mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${format.extension}`;
    await writeFile(join(directory, filename), file.buffer, { flag: 'wx' });
    return {
      success: true,
      message: 'Image uploaded successfully',
      data: { url: `/api/uploads/site-media/${filename}` },
    };
  }

  @Post('videos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: 25 * 1024 * 1024 },
    }),
  )
  async uploadVideo(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Select a video to upload');
    const format = videoSignatures.find((candidate) =>
      candidate.matches(file.buffer),
    );
    if (!format)
      throw new BadRequestException('Use an MP4 or WEBM video');

    const directory = join(
      this.config.getOrThrow<string>('uploadDir'),
      'site-media',
    );
    await mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${format.extension}`;
    await writeFile(join(directory, filename), file.buffer, { flag: 'wx' });
    return {
      success: true,
      message: 'Video uploaded successfully',
      data: { url: `/api/uploads/site-media/${filename}` },
    };
  }
}
