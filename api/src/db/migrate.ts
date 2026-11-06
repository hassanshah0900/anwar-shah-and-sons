import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { fileURLToPath } from 'node:url';
import { createDatabase, createPool, schemaFromUrl, type Database } from './connection.js';

/** The committed migrations. Resolves the same from src/db and dist/db. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** The last Prisma migration. Databases that reached it match Drizzle's baseline. */
const LAST_PRISMA_MIGRATION = '20261106145954_add_reviews';

/**
 * Applies pending migrations to the database (and schema) in the connection string.
 * Migrations already applied are skipped, and nothing is ever dropped.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const schemaName = schemaFromUrl(databaseUrl) ?? 'public';
  const pool = createPool(databaseUrl);
  try {
    const db = createDatabase(pool);
    await adoptPrismaDatabase(db, schemaName);
    // Each schema records its own migrations, so dropping a test schema resets them too.
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER, migrationsSchema: schemaName });
  } finally {
    await pool.end();
  }
}

/**
 * Databases created before the move to Drizzle already have the baseline's tables,
 * applied by Prisma. Record the baseline as applied for them instead of running it.
 */
async function adoptPrismaDatabase(db: Database, schemaName: string): Promise<void> {
  const prismaTable = `${schemaName}._prisma_migrations`;
  const { rows: prisma } = await db.execute<{ exists: boolean }>(
    sql`SELECT to_regclass(${prismaTable}) IS NOT NULL AS "exists"`,
  );
  if (!prisma[0]?.exists) return;

  const inSchema = sql.identifier(schemaName);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${inSchema}."__drizzle_migrations" (
      id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
    )`);
  const { rows: recorded } = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS "count" FROM ${inSchema}."__drizzle_migrations"`,
  );
  if ((recorded[0]?.count ?? 0) > 0) return;

  const { rows: finished } = await db.execute<{ count: number }>(sql`
    SELECT count(*)::int AS "count" FROM ${inSchema}."_prisma_migrations"
    WHERE migration_name = ${LAST_PRISMA_MIGRATION} AND finished_at IS NOT NULL`);
  if ((finished[0]?.count ?? 0) === 0) {
    throw new Error(
      `This database has Prisma migrations but not ${LAST_PRISMA_MIGRATION}. ` +
        'Apply the remaining Prisma migrations with an older checkout first.',
    );
  }

  const [baseline] = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  if (!baseline) throw new Error('The baseline migration is missing.');
  await db.execute(sql`
    INSERT INTO ${inSchema}."__drizzle_migrations" (hash, created_at)
    VALUES (${baseline.hash}, ${baseline.folderMillis})`);
}

// `npm run db:migrate` runs this file directly.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.');
  await runMigrations(databaseUrl);
  console.log('Database is up to date.');
}
