import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

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
