import { INestApplication } from '@nestjs/common';
import { userListSchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { cookiesFrom, createTestApp, WEB_ORIGIN } from './support/app.js';
import type { Database } from '../src/db/connection.js';
import { users } from '../src/db/schema/index.js';
import { makeAdmin, testDatabase } from './support/database.js';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;

  const signUp = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('Origin', WEB_ORIGIN)
      .send({ name: email.split('@')[0], email, password: 'correct-horse-battery' })
      .expect(200);
    return cookiesFrom(response);
  };

  beforeAll(async () => {
    app = await createTestApp();
    db = testDatabase(app);
    await db.delete(users);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/users/me', () => {
    it('requires a session', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('returns the public profile of the signed-in user', async () => {
      const cookies = await signUp('me@example.com');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toEqual({
        id: expect.any(String),
        name: 'me',
        email: 'me@example.com',
        emailVerified: false,
        image: null,
        role: 'customer',
      });
    });
  });

  describe('GET /api/v1/users', () => {
    it('is forbidden for customers', async () => {
      const cookies = await signUp('customer@example.com');

      await request(app.getHttpServer()).get('/api/v1/users').set('Cookie', cookies).expect(403);
    });

    it('lists users for admins', async () => {
      const cookies = await signUp('admin@example.com');
      await makeAdmin(db, 'admin@example.com');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', cookies)
        .expect(200);

      const list = userListSchema.parse(response.body);
      expect(list.total).toBe(3);
      expect(list.users.map((user) => user.email)).toContain('admin@example.com');
    });

    it('pages through users', async () => {
      await signUp('first@example.com');
      await signUp('second@example.com');
      const cookies = await signUp('pager@example.com');
      await makeAdmin(db, 'pager@example.com');
      const page = (query: string) =>
        request(app.getHttpServer()).get(`/api/v1/users?${query}`).set('Cookie', cookies);

      const first = userListSchema.parse((await page('pageSize=2').expect(200)).body);
      const second = userListSchema.parse((await page('pageSize=2&page=2').expect(200)).body);

      expect(first.users).toHaveLength(2);
      expect(second.total).toBe(first.total);
      expect(second.users.map((user) => user.id)).not.toContain(first.users[0]?.id);
    });

    it('refuses a page size above the limit', async () => {
      const cookies = await signUp('limit@example.com');
      await makeAdmin(db, 'limit@example.com');

      await request(app.getHttpServer())
        .get('/api/v1/users?pageSize=101')
        .set('Cookie', cookies)
        .expect(400);
    });
  });
});
