import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from '../src/health.controller';

describe('Health API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getConnectionToken(), useValue: { readyState: 1 } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('GET /api/health reports a connected database', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((response) => {
        const body = response.body as Record<string, unknown>;
        expect(body).toEqual(
          expect.objectContaining({
            success: true,
            status: 'ok',
            service: 'guwahati-homestay-api',
            database: 'connected',
          }),
        );
        expect(typeof body.uptimeSeconds).toBe('number');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  afterAll(() => app.close());
});
