import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1', { exclude: ['api/health', 'api/docs'] });
  app.use(helmet());

  const origins = new Set(config.get<string[]>('frontendUrls') || []);
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];
  for (const host of vercelHosts) {
    if (host) origins.add(`https://${host}`);
  }
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
    { ui: false, raw: ['json'] },
  );
}

async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  return app;
}

let serverPromise: Promise<Express> | undefined;

async function createServer(): Promise<Express> {
  const app = await createApplication();
  await app.init();
  return app.getHttpAdapter().getInstance() as Express;
}

export default async function handler(
  request: Request,
  response: Response,
): Promise<void> {
  serverPromise ??= createServer();
  const server = await serverPromise;
  await new Promise<void>((resolve, reject) => {
    response.once('finish', resolve);
    response.once('close', resolve);
    response.once('error', reject);
    server(request, response);
  });
}

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const config = app.get(ConfigService);
  await app.listen(config.get<number>('port') || 5000, '0.0.0.0');
}

// Start a network listener only when this file is executed directly. Vercel
// imports the module and invokes the exported handler instead.
if (require.main === module) {
  void bootstrap();
}
