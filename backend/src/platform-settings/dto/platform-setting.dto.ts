import {
  IsArray,
  IsDateString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsIn,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class UpdateCashfreeSettingsDto {
  @IsOptional() @IsString() @MaxLength(200) appId?: string;
  @IsOptional() @IsString() @MaxLength(300) secretKey?: string;
  @IsOptional() @IsString() @MaxLength(300) webhookSecret?: string;
  @IsOptional() @IsString() @MaxLength(200) payoutClientId?: string;
  @IsOptional() @IsString() @MaxLength(300) payoutClientSecret?: string;
  @IsOptional() @IsBoolean() liveMode?: boolean;
  @IsOptional() @IsIn(['RAZORPAY', 'CASHFREE']) activeGateway?: string;
}

export class UpdateAiSensySettingsDto {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  apiUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) apiKey?: string;
  @IsOptional() @IsString() @MaxLength(160) otpCampaign?: string;
}

export class GstSlabDto {
  @IsOptional() @IsNumber() @Min(0) maxNightlyRate?: number | null;
  @IsNumber() @Min(0) @Max(100) ratePercent: number;
}

export class CouponDto {
  @IsString() @MaxLength(32) code: string;
  @IsNumber() @Min(0.01) @Max(99) percent: number;
  @IsBoolean() active: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}

export class UpdatePricingSettingsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => GstSlabDto)
  gstSlabs: GstSlabDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => CouponDto)
  coupons: CouponDto[];
}
