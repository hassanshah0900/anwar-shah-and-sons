import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { appOptions, configureApp } from '../../src/app.setup.js';

/** Boots the full application, configured exactly like main.ts. */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({
    ...appOptions,
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}

/** The web origin the API trusts; auth requests from elsewhere are rejected. */
export const WEB_ORIGIN = 'http://localhost:3000';

/** The cookies a response set, ready to send back with the next request. */
export function cookiesFrom(response: { headers: Record<string, unknown> }): string[] {
  const cookies = response.headers['set-cookie'];
  if (Array.isArray(cookies)) return cookies.map(String);
  return typeof cookies === 'string' ? [cookies] : [];
}
