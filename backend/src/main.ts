import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1', { exclude: ['api/health', 'api/docs'] });
  app.use(helmet());
  const origins = config.get<string[]>('frontendUrls') || [];
  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (error: Error | null, allow?: boolean) => void,
    ) =>
      !origin || origins.includes(origin)
        ? cb(null, true)
        : cb(new Error('Origin not allowed'), false),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  const swagger = new DocumentBuilder()
    .setTitle('Guwahati Homestay Super Admin API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
  );
  await app.listen(config.get<number>('port') || 5000, '0.0.0.0');
}
void bootstrap();
