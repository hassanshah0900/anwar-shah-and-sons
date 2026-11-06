import { runMigrations } from '../../src/db/migrate.js';

/**
 * Brings the e2e schema up to date with the committed migrations. Migrating only
 * applies pending migrations and never drops data; each suite clears the rows it
 * needs before it runs.
 */
export default async function setup(): Promise<void> {
  const url = process.env['E2E_DATABASE_URL'] ?? '';
  if (new URL(url).searchParams.get('schema') !== 'e2e') {
    throw new Error('Refusing to run e2e tests outside the e2e schema.');
  }

  await runMigrations(url);
}
