import { readMigrationFiles } from 'drizzle-orm/migrator';
import { MIGRATIONS_FOLDER } from './migrate.js';

describe('migrations', () => {
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });

  it('exist, starting with the baseline', () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  // The tests build their own schemas from these files, so they must not name `public`.
  // `npm run db:new-migration` removes it; this catches a migration generated another way.
  it('never name the public schema', () => {
    for (const migration of migrations) {
      expect(migration.sql.join('')).not.toContain('"public".');
    }
  });
});
