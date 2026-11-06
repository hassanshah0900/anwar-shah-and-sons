import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { appOptions, configureApp } from '../src/app.setup.js';
import { DATABASE } from '../src/db/database.module.js';

describe('GET /api/health (e2e)', () => {
  const db = { execute: vi.fn() };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE)
      .useValue(db)
      .compile();

    app = moduleRef.createNestApplication({ ...appOptions, logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 and the health contract when the database is up', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });

    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(healthResponseSchema.parse(response.body).status).toBe('ok');
  });

  it('returns 503 when the database is down', async () => {
    db.execute.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    const response = await request(app.getHttpServer()).get('/api/health').expect(503);

    expect(healthResponseSchema.parse(response.body).status).toBe('error');
  });

  it('is not versioned', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });

  it('sets security headers and allows the configured CORS origin', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
