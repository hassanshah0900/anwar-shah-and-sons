import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import type { Env } from './config/env.js';

/**
 * HTTP-level configuration shared by `main.ts` and the e2e tests, so tests
 * exercise the same routes, headers and CORS policy as the running app.
 *
 * Routes: /api/v1/... for versioned resources, /api/health for the health check.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
}
