import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('GET /health (e2e)', () => {
  const prisma = { $queryRaw: vi.fn(), $disconnect: vi.fn() };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and the health contract when the database is up', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(healthResponseSchema.parse(response.body).status).toBe('ok');
  });

  it('returns 503 when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    const response = await request(app.getHttpServer()).get('/health').expect(503);

    expect(healthResponseSchema.parse(response.body).status).toBe('error');
  });
});
