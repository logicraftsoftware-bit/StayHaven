import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsIn,
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
  @IsOptional() @IsString() identifier?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @MinLength(1) password: string;
}
export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(7) @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(180) email?: string;
  @IsOptional() @IsString() @MaxLength(30) gender?: string;
  @IsOptional() @IsString() @MaxLength(60) nationality?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(2000) avatarUrl?: string;
}

export class RequestCustomerOtpDto {
  @IsString() @MinLength(10) @MaxLength(18) phone: string;
  @IsIn(['register', 'login', 'forgot-password']) purpose:
    'register' | 'login' | 'forgot-password';
}
export class RequestCustomerAccessDto {
  @IsString() @MinLength(10) @MaxLength(18) phone: string;
}
export class VerifyCustomerOtpDto extends RequestCustomerOtpDto {
  @IsString() @MinLength(6) @MaxLength(6) otp: string;
}
export class CompleteCustomerRegistrationDto {
  @IsString() verificationToken: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsEmail() @MaxLength(180) email?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
  @IsBoolean() acceptTerms: boolean;
}
export class ResetCustomerPasswordDto {
  @IsString() resetToken: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
export class AddCoTravellerDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(30) gender?: string;
  @IsOptional() @IsString() @MaxLength(60) relation?: string;
  @IsOptional() @IsString() @MaxLength(30) dateOfBirth?: string;
}
export class ChangeCustomerPasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
