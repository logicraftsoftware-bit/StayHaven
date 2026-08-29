import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1', { exclude: ['api/health', 'api/docs'] });
  const origins = new Set(config.get<string[]>('frontendUrls') || []);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) =>
      !origin || origins.has(origin)
        ? callback(null, true)
        : callback(new Error('Origin not allowed'), false),
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
    { ui: true, raw: ['json'] },
  );

  // Register Helmet after Swagger so its strict CSP does not block Swagger UI.
  app.use(helmet());
}

async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  app.enableShutdownHooks();
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('port');
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `API listening on http://0.0.0.0:${port} (${config.get<string>('nodeEnv')})`,
    'Bootstrap',
  );
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Application failed to start',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
