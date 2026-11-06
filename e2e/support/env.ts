import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const API_DIR = fileURLToPath(new URL('../../api', import.meta.url));
export const WEB_DIR = fileURLToPath(new URL('../../web', import.meta.url));

// Ports of their own, so the tests can't reach a dev server by mistake.
export const WEB_URL = 'http://localhost:3310';
export const API_URL = 'http://localhost:4310';
export const FAKE_STRIPE_PORT = 4311;
export const FAKE_STRIPE_URL = `http://localhost:${FAKE_STRIPE_PORT}`;
export const WEBHOOK_SECRET = 'whsec_browser_tests';
export const WEBHOOK_URL = `${API_URL}/api/v1/webhooks/stripe`;

/** Every run wipes this schema, so it must only ever hold test data. */
export const SCHEMA = 'browser_tests';

export const ADMIN = { email: 'admin@example.com', password: 'browser-tests-admin' };
export const SHOPPER = { email: 'ayesha.khan@demo.example.com', password: 'demo-password' };
export const SHIPPING = 250;

function databaseUrl(): string {
  // CI sets DATABASE_URL; on a laptop it comes from the API's .env.
  if (!process.env['DATABASE_URL']) {
    try {
      process.loadEnvFile(join(API_DIR, '.env'));
    } catch {
      // Reported below.
    }
  }
  const value = process.env['DATABASE_URL'];
  if (!value) throw new Error('Browser tests need DATABASE_URL, or api/.env.');

  const url = new URL(value);
  url.searchParams.set('schema', SCHEMA);
  return url.toString();
}

export const DATABASE_URL = databaseUrl();

/** The API's settings. Explicit, so a developer's .env can't change what's tested. */
export const apiEnv: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: new URL(API_URL).port,
  CORS_ORIGIN: WEB_URL,
  DATABASE_URL,
  BETTER_AUTH_SECRET: 'browser-tests-secret-of-at-least-32-characters',
  BETTER_AUTH_URL: WEB_URL,
  STORE_CURRENCY: 'PKR',
  STORE_LOCALE: 'en-PK',
  SHIPPING_FLAT_RATE: String(SHIPPING),
  FREE_SHIPPING_OVER: '',
  EMAIL_DRIVER: 'log',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_DIR: join(tmpdir(), 'anwar-shah-and-sons-browser-tests'),
  STRIPE_SECRET_KEY: 'sk_test_browser_tests',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_API_URL: FAKE_STRIPE_URL,
  ADMIN_NAME: 'Store Admin',
  ADMIN_EMAIL: ADMIN.email,
  ADMIN_PASSWORD: ADMIN.password,
};
