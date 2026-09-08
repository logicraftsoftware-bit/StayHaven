import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMapSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  googleMapsBrowserKey?: string;
}

export class UpdateAdminBrandingDto {
  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(2000)
  panelLogo?: string;
}

export class UpdateRazorpaySettingsDto {
  @IsOptional() @IsString() @MaxLength(200) keyId?: string;
  @IsOptional() @IsString() @MaxLength(300) keySecret?: string;
  @IsOptional() @IsString() @MaxLength(300) webhookSecret?: string;
  @IsOptional() @IsString() @MaxLength(100) accountNumber?: string;
  @IsOptional() @IsBoolean() liveMode?: boolean;
  @IsOptional() @IsNumber() @Min(1000) minimumWithdrawalAmount?: number;
}
