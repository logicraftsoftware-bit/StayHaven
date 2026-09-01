import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminStatus } from '../../common/enums/status.enum';
import { AdminPermission } from '../../common/enums/admin-permission.enum';
export class UpdateAdminDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() avatar?: string;
}
export class ChangePasswordDto {
  @IsString() @MinLength(8) currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

export enum AdminLevel {
  MAIN_ADMIN = 'MAIN_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  USER = 'USER',
}

export class CreateManagedAdminDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum(AdminLevel) adminLevel: AdminLevel;
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions: AdminPermission[];
  @IsArray() @IsMongoId({ each: true }) siteIds: string[];
  @IsOptional() @IsUrl() avatar?: string;
}

export class UpdateManagedAdminDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsEnum(AdminLevel) adminLevel?: AdminLevel;
  @IsOptional()
  @IsArray()
  @IsEnum(AdminPermission, { each: true })
  permissions?: AdminPermission[];
  @IsOptional() @IsArray() @IsMongoId({ each: true }) siteIds?: string[];
  @IsOptional() @IsEnum(AdminStatus) status?: AdminStatus;
  @IsOptional() @IsUrl() avatar?: string;
}
