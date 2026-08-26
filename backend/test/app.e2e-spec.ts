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
      .expect({ success: true, status: 'ok', database: 'connected' });
  });

  afterAll(() => app.close());
});
