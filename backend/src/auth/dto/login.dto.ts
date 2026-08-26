import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class LoginDto {
  @ApiProperty({ example: 'admin@guwahatihomestay.com' })
  @IsEmail()
  email: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
}
