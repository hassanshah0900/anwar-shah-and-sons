import { INestApplication } from '@nestjs/common';
import { userListSchema } from '@repo/shared';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cookiesFrom, createTestApp, WEB_ORIGIN } from './support/app.js';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
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
      await prisma.user.update({ where: { email: 'admin@example.com' }, data: { role: 'admin' } });

      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', cookies)
        .expect(200);

      const list = userListSchema.parse(response.body);
      expect(list.total).toBe(3);
      expect(list.users.map((user) => user.email)).toContain('admin@example.com');
    });
  });
});
