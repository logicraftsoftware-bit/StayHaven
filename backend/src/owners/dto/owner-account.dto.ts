import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterOwnerDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() @MaxLength(180) email: string;
  @IsString() @MinLength(7) @MaxLength(30) phone: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsOptional() @IsString() @MaxLength(160) businessName?: string;
}

export class OwnerLoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(1) password: string;
}

export class UpdateOwnerProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(7) @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(160) businessName?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(500) profileImage?: string;
}

export class ChangeOwnerPasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
