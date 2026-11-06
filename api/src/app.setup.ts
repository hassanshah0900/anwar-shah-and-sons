import { INestApplication, NestApplicationOptions, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DatabaseExceptionFilter } from './common/database-exception.filter.js';
import type { Env } from './config/env.js';

/**
 * Options for NestFactory.create. Better Auth reads raw request bodies, so Nest's
 * parser is off; the auth module re-adds parsers for every other route.
 */
export const appOptions: NestApplicationOptions = { bodyParser: false };

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
  app.useGlobalFilters(new DatabaseExceptionFilter());
  app.enableShutdownHooks();
}
