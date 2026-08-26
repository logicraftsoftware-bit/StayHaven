import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? (payload as { message: string | string[] }).message
        : 'Something went wrong';
    res.status(status).json({
      success: false,
      message: Array.isArray(message) ? message.join(', ') : message,
      error: status === 500 ? 'INTERNAL_SERVER_ERROR' : HttpStatus[status],
    });
  }
}
