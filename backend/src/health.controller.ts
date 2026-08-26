import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Connection } from 'mongoose';
@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}
  @Get() check() {
    if (Number(this.connection.readyState) !== 1)
      throw new ServiceUnavailableException('Database unavailable');
    return { success: true, status: 'ok', database: 'connected' };
  }
}
