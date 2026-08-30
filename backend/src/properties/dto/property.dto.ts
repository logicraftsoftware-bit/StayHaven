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
}

export class OwnerPropertyQueryDto {
  @IsOptional() @IsMongoId() siteId?: string;
  @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
}

export class CreateOwnerPropertyDto {
  @IsOptional() @IsMongoId() siteId?: string;
  @IsString() @MaxLength(180) name: string;
  @IsString() @MaxLength(80) propertyType: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsString() @MaxLength(500) address: string;
  @IsString() @MaxLength(120) city: string;
  @IsString() @MaxLength(120) state: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) taxes?: number;
  @IsOptional() @IsNumber() @Min(1) rooms?: number;
  @IsOptional() @IsNumber() @Min(1) maxGuests?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
  @IsOptional() @IsBoolean() submit?: boolean;
}

export class UpdateOwnerPropertyDto extends PartialType(
  CreateOwnerPropertyDto,
) {}
