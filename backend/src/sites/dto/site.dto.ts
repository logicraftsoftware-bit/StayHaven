import {
  IsEnum,
  IsArray,
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
  @IsString() domain: string;
  @IsOptional() @IsArray() @IsString({ each: true }) domains?: string[];
  @IsString() city: string;
  @IsString() state: string;
  @IsString() country: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsString() favicon?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() heroTitle?: string;
  @IsOptional() @IsString() heroSubtitle?: string;
  @IsOptional() @IsString() ogImage?: string;
  @IsOptional() @IsObject() theme?: Record<string, string>;
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
  @IsOptional() @IsObject() contact?: Record<string, unknown>;
  @IsOptional() @IsObject() social?: Record<string, unknown>;
}
export class UpdateSiteDto extends PartialType(CreateSiteDto) {}
export class SiteStatusDto {
  @IsEnum(SiteStatus) status: SiteStatus;
}
