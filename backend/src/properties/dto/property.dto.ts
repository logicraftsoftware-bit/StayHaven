import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { PropertyStatus } from '../../common/enums/status.enum';
export class PropertyQueryDto {
  @Type(() => Number) @Min(1) page = 1;
  @Type(() => Number) @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
  @IsOptional() @IsMongoId() siteId?: string;
  @IsOptional() @IsMongoId() ownerId?: string;
  @IsOptional() @IsString() search?: string;
}
export class ReviewReasonDto {
  @IsString() reason: string;
  @IsOptional() @IsArray() @IsString({ each: true }) sections?: string[];
}

export class OwnerPropertyQueryDto {
  @IsOptional() @IsMongoId() siteId?: string;
  @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
}

export class CreateOwnerPropertyDto {
  @IsOptional() @IsMongoId() siteId?: string;
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsMongoId() propertyTypeId?: string;
  @IsOptional() @IsString() @MaxLength(80) propertyType?: string;
  @IsOptional() @IsString() @MaxLength(180) displayName?: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) state?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) taxes?: number;
  @IsOptional() @IsNumber() @Min(1) rooms?: number;
  @IsOptional() @IsNumber() @Min(1) maxGuests?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
  @IsOptional() @IsObject() basicInfo?: Record<string, unknown>;
  @IsOptional() @IsObject() locationDetails?: Record<string, unknown>;
  @IsOptional() @IsObject() location?: Record<string, unknown>;
  @IsOptional() @IsArray() roomDetails?: Record<string, unknown>[];
  @IsOptional() @IsArray() media?: Record<string, unknown>[];
  @IsOptional() @IsArray() mealPlans?: Record<string, unknown>[];
  @IsOptional() @IsObject() policies?: Record<string, unknown>;
  @IsOptional() @IsObject() financeLegal?: Record<string, unknown>;
  @IsOptional() @IsArray() documents?: Record<string, unknown>[];
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
  @IsOptional() @IsBoolean() submit?: boolean;
}

export class UpdateOwnerPropertyDto extends PartialType(
  CreateOwnerPropertyDto,
) {}
