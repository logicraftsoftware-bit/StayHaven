import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
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
