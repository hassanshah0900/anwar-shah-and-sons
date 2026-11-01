import { config as loadEnv } from 'dotenv';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

// E2E tests run against a real PostgreSQL (see README), in a dedicated `e2e`
// schema so they never touch development data.
loadEnv({ quiet: true });

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('E2E tests need DATABASE_URL pointing at a running PostgreSQL.');
}

const e2eDatabaseUrl = new URL(databaseUrl);
e2eDatabaseUrl.searchParams.set('schema', 'e2e');
process.env['E2E_DATABASE_URL'] = e2eDatabaseUrl.toString();

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/support/global-setup.ts'],
    // Suites share one database, so run files one at a time.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_URL: e2eDatabaseUrl.toString(),
      BETTER_AUTH_SECRET: 'e2e-secret-that-is-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3000',
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_DIR: join(tmpdir(), 'anwar-shah-and-sons-e2e-uploads'),
    },
  },
});
