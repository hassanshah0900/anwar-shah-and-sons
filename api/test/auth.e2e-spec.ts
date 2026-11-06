import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { cookiesFrom, createTestApp, WEB_ORIGIN } from './support/app.js';
import { users } from '../src/db/schema/index.js';
import { testDatabase } from './support/database.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const credentials = {
    name: 'Ayesha Khan',
    email: 'ayesha@example.com',
    password: 'correct-horse-battery',
  };

  beforeAll(async () => {
    app = await createTestApp();
    await testDatabase(app).delete(users);
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, body: object, origin = WEB_ORIGIN) =>
    request(app.getHttpServer()).post(path).set('Origin', origin).send(body);

  it('signs up a customer and starts a session', async () => {
    const response = await post('/api/auth/sign-up/email', credentials).expect(200);

    expect(response.body.user).toMatchObject({ email: credentials.email, role: 'customer' });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/session_token=.+HttpOnly/i)]),
    );
  });

  it('never returns the password hash', async () => {
    const response = await post('/api/auth/sign-in/email', credentials).expect(200);

    expect(JSON.stringify(response.body)).not.toMatch(/password/i);
  });

  it('rejects a second account with the same email', async () => {
    await post('/api/auth/sign-up/email', credentials).expect(422);
  });

  it('returns the session for the cookie it issued', async () => {
    const signIn = await post('/api/auth/sign-in/email', credentials).expect(200);

    const session = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', cookiesFrom(signIn))
      .expect(200);

    expect(session.body.user).toMatchObject({ email: credentials.email, role: 'customer' });
  });

  it('rejects a wrong password without revealing whether the email exists', async () => {
    const wrongPassword = await post('/api/auth/sign-in/email', {
      email: credentials.email,
      password: 'not-the-password',
    }).expect(401);
    const unknownEmail = await post('/api/auth/sign-in/email', {
      email: 'nobody@example.com',
      password: 'not-the-password',
    }).expect(401);

    expect(wrongPassword.body.code).toBe(unknownEmail.body.code);
  });

  it('rejects passwords below the minimum length', async () => {
    await post('/api/auth/sign-up/email', {
      ...credentials,
      email: 'b@example.com',
      password: 'short',
    }).expect(400);
  });

  it('rejects requests from an untrusted origin (CSRF)', async () => {
    await post('/api/auth/sign-in/email', credentials, 'https://evil.example').expect(403);
  });
});
