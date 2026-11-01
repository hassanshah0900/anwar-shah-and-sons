import { INestApplication } from '@nestjs/common';
import { storeConfigSchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp } from './support/app.js';

describe('GET /api/v1/store (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('is public and returns the store currency and locale', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/store').expect(200);

    expect(storeConfigSchema.parse(response.body)).toEqual({ currency: 'PKR', locale: 'en-PK' });
  });
});
