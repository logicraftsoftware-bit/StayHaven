import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterCustomerDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() @MaxLength(180) email: string;
  @IsOptional() @IsString() @MinLength(7) @MaxLength(30) phone?: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsBoolean() acceptTerms: boolean;
}
export class CustomerLoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(1) password: string;
}
export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(7) @MaxLength(30) phone?: string;
}
export class ChangeCustomerPasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
