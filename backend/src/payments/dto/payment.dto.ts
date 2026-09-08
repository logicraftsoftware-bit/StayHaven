import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingOrderDto {
  @IsMongoId() propertyId: string;
  @IsString() @MaxLength(100) roomId: string;
  @IsDateString() checkIn: string;
  @IsDateString() checkOut: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) rooms: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) adults: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(30) children: number;
  @IsString() @MaxLength(120) guestName: string;
  @IsEmail() guestEmail: string;
  @IsString() @MaxLength(30) guestPhone: string;
}
export class VerifyPaymentDto {
  @IsString() razorpayOrderId: string;
  @IsString() razorpayPaymentId: string;
  @IsString() razorpaySignature: string;
}
export class SaveBankAccountDto {
  @IsString() @MaxLength(120) beneficiaryName: string;
  @Matches(/^\d{6,20}$/) accountNumber: string;
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/) ifsc: string;
}
export class RequestWithdrawalDto {
  @Type(() => Number) @IsInt() @Min(1000) amount: number;
}
export class PaymentQueryDto {
  @IsOptional() @IsMongoId() propertyId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
