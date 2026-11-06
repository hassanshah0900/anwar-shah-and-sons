import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { Mailer, type MailMessage } from '../src/mail/mailer.js';
import { cookiesFrom, createTestApp, WEB_ORIGIN } from './support/app.js';
import { signUpAs } from './support/users.js';
import { like } from 'drizzle-orm';
import { users } from '../src/db/schema/index.js';
import { testDatabase } from './support/database.js';

describe('Password reset (e2e)', () => {
  let app: INestApplication<App>;
  let sent: MailMessage[];

  const http = () => request(app.getHttpServer());
  const requestReset = (email: string) =>
    http()
      .post('/api/auth/request-password-reset')
      .set('Origin', WEB_ORIGIN)
      .send({ email, redirectTo: '/reset-password' });
  const signIn = (email: string, password: string) =>
    http().post('/api/auth/sign-in/email').set('Origin', WEB_ORIGIN).send({ email, password });

  beforeAll(async () => {
    app = await createTestApp();
    await testDatabase(app).delete(users).where(like(users.email, '%@reset.test'));
  });

  beforeEach(() => {
    sent = [];
    vi.spyOn(app.get(Mailer), 'send').mockImplementation(async (message) => {
      sent.push(message);
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('emails a link that leads to a working reset, and signs out old sessions', async () => {
    const oldSession = await signUpAs(app, 'forgetful@reset.test');

    await requestReset('forgetful@reset.test').expect(200);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    const [email] = sent;
    expect(email).toMatchObject({
      to: 'forgetful@reset.test',
      subject: expect.stringMatching(/Reset/),
    });

    // The link points at the web app, which proxies /api/auth to the API.
    const link = new URL(email!.text.match(/https?:\/\/\S+/)![0]);
    expect(link.origin).toBe(WEB_ORIGIN);
    const redirect = await http()
      .get(link.pathname + link.search)
      .expect(302);
    const token = new URL(redirect.headers['location']!, WEB_ORIGIN).searchParams.get('token');
    expect(token).toEqual(expect.any(String));

    await http()
      .post('/api/auth/reset-password')
      .set('Origin', WEB_ORIGIN)
      .send({ token, newPassword: 'a-brand-new-password' })
      .expect(200);

    await signIn('forgetful@reset.test', 'correct-horse-battery').expect(401);
    const fresh = await signIn('forgetful@reset.test', 'a-brand-new-password').expect(200);
    expect(cookiesFrom(fresh)).not.toHaveLength(0);

    const old = await http().get('/api/auth/get-session').set('Cookie', oldSession).expect(200);
    expect(old.body).toBeNull();
  });

  it('answers the same for unknown addresses, without sending anything', async () => {
    await requestReset('nobody@reset.test').expect(200);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(sent).toEqual([]);
  });

  it('refuses a made-up token', async () => {
    await http()
      .post('/api/auth/reset-password')
      .set('Origin', WEB_ORIGIN)
      .send({ token: 'not-a-token', newPassword: 'a-brand-new-password' })
      .expect(400);
  });
});
