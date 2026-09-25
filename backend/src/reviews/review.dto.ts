import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ReviewCategoriesDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) cleanliness?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) location?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) service?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) value?: number;
}
export class SubmitReviewDto {
  @IsMongoId() bookingId: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => ReviewCategoriesDto)
  categories?: ReviewCategoriesDto;
}
export class ReplyReviewDto {
  @IsString() @MaxLength(1500) reply: string;
}
