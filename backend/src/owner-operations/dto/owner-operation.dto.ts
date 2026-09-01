import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
export const teamPermissions = [
  'VIEW_PROPERTIES',
  'EDIT_PROPERTIES',
  'VIEW_BOOKINGS',
  'MANAGE_BOOKINGS',
  'VIEW_PAYMENTS',
  'VIEW_RATES',
  'MANAGE_RATES',
  'VIEW_ANALYTICS',
  'MANAGE_TEAM',
  'VIEW_REVIEWS',
  'MANAGE_REVIEWS',
  'CONTACT_SUPPORT',
] as const;
export class TeamMemberDto {
  @IsString() @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: string;
  @IsArray() @IsEnum(teamPermissions, { each: true }) permissions: string[];
  @IsArray() @IsMongoId({ each: true }) assignedPropertyIds: string[];
  @IsOptional() @IsString() @MinLength(8) temporaryPassword?: string;
}
export class TeamLoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
export class SupportTicketDto {
  @IsOptional() @IsMongoId() propertyId?: string;
  @IsString() category: string;
  @IsString() @MaxLength(180) subject: string;
  @IsString() @MaxLength(5000) description: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachments?: string[];
  @IsOptional() @IsEnum(['low', 'normal', 'high']) priority?: string;
}
