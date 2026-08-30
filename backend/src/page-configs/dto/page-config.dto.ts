import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PAGE_SLUGS, SECTION_TYPES } from '../page-config.constants';
export class PageSeoDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(320) description?: string;
  @IsOptional() @IsString() @MaxLength(500) canonical?: string;
  @IsOptional() @IsBoolean() noindex?: boolean;
}
export class PageSectionDto {
  @IsString() @MaxLength(80) id: string;
  @IsIn(SECTION_TYPES) type: string;
  @IsBoolean() enabled: boolean;
  @IsInt() @Min(0) @Max(1000) order: number;
  @IsObject() config: Record<string, unknown>;
}
export class UpdatePageConfigDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() preset?: string;
  @IsOptional() @ValidateNested() @Type(() => PageSeoDto) seo?: PageSeoDto;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageSectionDto)
  sections: PageSectionDto[];
}
export class PageSlugDto {
  @IsIn(PAGE_SLUGS) page: string;
}
