import { execSync } from 'node:child_process';
import pg from 'pg';
import { API_DIR, apiEnv, DATABASE_URL, SCHEMA } from './env.ts';

/**
 * Starts each run from the same data: wipes the tests' own schema, applies the
 * migrations, and adds the admin and the demo shop. Other schemas aren't touched.
 */
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
await client.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
await client.end();

const run = (command: string) =>
  execSync(command, { cwd: API_DIR, env: { ...process.env, ...apiEnv }, stdio: 'inherit' });

run('npx prisma migrate deploy');
run('npm run db:seed');
run('npm run db:seed:demo');
