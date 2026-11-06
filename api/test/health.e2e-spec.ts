import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('GET /api/health (e2e)', () => {
  const prisma = { $queryRaw: vi.fn(), $disconnect: vi.fn() };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication({ ...appOptions, logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and the health contract when the database is up', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(healthResponseSchema.parse(response.body).status).toBe('ok');
  });

  it('returns 503 when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    const response = await request(app.getHttpServer()).get('/api/health').expect(503);

    expect(healthResponseSchema.parse(response.body).status).toBe('error');
  });

  it('is not versioned', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });

  it('sets security headers and allows the configured CORS origin', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
