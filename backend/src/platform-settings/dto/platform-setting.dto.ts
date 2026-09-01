import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMapSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  googleMapsBrowserKey?: string;
}
