import {
  IsEnum,
  IsFQDN,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { SiteStatus } from '../../common/enums/status.enum';
export class CreateSiteDto {
  @IsString() @MinLength(2) name: string;
  @Matches(/^[a-z0-9-]+$/) slug: string;
  @IsFQDN() domain: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() country: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsString() favicon?: string;
  @IsOptional() @IsObject() theme?: Record<string, string>;
}
export class UpdateSiteDto extends PartialType(CreateSiteDto) {}
export class SiteStatusDto {
  @IsEnum(SiteStatus) status: SiteStatus;
}
