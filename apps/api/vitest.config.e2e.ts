import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Satisfies env validation without a local .env (e.g. in CI).
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test',
    },
  },
});
