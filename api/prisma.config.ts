import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Read leniently (not via `env()`) so `prisma generate` works without a database,
    // e.g. in CI or a Docker build. Commands that need a connection fail with a clear error.
    url: process.env['DATABASE_URL'],
  },
});
