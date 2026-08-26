import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { OwnerStatus } from '../../common/enums/status.enum';
export class OwnerQueryDto {
  @IsOptional() @IsEnum(OwnerStatus) status?: OwnerStatus;
  @IsOptional() @IsMongoId() siteId?: string;
  @IsOptional() @IsString() search?: string;
}
export class OwnerStatusDto {
  @IsEnum(OwnerStatus) status: OwnerStatus;
}
