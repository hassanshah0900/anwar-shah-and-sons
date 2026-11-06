import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

/**
 * The Postgres schema named by the connection string's `?schema=` parameter, if any.
 * The tests use it to keep their data apart from development data.
 */
export function schemaFromUrl(databaseUrl: string): string | undefined {
  const name = new URL(databaseUrl).searchParams.get('schema') ?? undefined;
  if (name !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid schema name in DATABASE_URL: "${name}"`);
  }
  return name;
}

/**
 * A connection pool for the connection string. The driver ignores `?schema=`, so it is
 * applied through each connection's search_path; otherwise queries would silently run
 * against `public`. Connections open lazily, so the API can start while the database is
 * down and report it through the health check.
 */
export function createPool(databaseUrl: string): pg.Pool {
  const schemaName = schemaFromUrl(databaseUrl);
  return new pg.Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    ...(schemaName && { options: `-c search_path=${schemaName}` }),
  });
}

export function createDatabase(pool: pg.Pool): Database {
  return drizzle(pool, { schema });
}
