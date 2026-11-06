import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  // Only `db:studio` connects; `db:new-migration` works from the schema files alone.
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
});
