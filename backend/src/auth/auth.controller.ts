import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
@ApiTags('Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(private service: AuthService) {}
  @Post('login') @Throttle({ default: { limit: 5, ttl: 60000 } }) login(
    @Body() dto: LoginDto,
    @Req() req: { ip?: string; headers: Record<string, string> },
  ) {
    return this.service.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
