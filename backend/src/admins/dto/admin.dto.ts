import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class UpdateAdminDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() avatar?: string;
}
export class ChangePasswordDto {
  @IsString() @MinLength(8) currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}
