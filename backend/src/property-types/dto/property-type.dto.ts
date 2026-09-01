import { PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePropertyTypeDto {
  @IsString() @MaxLength(80) name: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsNumber() @Min(0) @Max(100) commissionPercent: number;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
export class UpdatePropertyTypeDto extends PartialType(CreatePropertyTypeDto) {}
