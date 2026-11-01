import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { cookiesFrom, WEB_ORIGIN } from './app.js';

/** Signs up a user (optionally promoting them to admin) and returns their session cookies. */
export async function signUpAs(
  app: INestApplication<App>,
  email: string,
  role: 'customer' | 'admin' = 'customer',
): Promise<string[]> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-up/email')
    .set('Origin', WEB_ORIGIN)
    .send({ name: email.split('@')[0], email, password: 'correct-horse-battery' })
    .expect(200);

  if (role === 'admin') {
    await app.get(PrismaService).user.update({ where: { email }, data: { role: 'admin' } });
  }
  return cookiesFrom(response);
}
