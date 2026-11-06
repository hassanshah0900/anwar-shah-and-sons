import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Builds the pg driver adapter for a connection string. The driver ignores the
 * `?schema=` parameter Prisma's CLI understands, so it is applied explicitly:
 * to model queries through the adapter's `schema`, and to raw SQL through the
 * connection's search_path. Otherwise queries silently run against `public`.
 */
export function createPrismaAdapter(databaseUrl: string): PrismaPg {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? undefined;
  if (schema !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid schema name in DATABASE_URL: "${schema}"`);
  }

  return new PrismaPg(
    {
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5_000,
      ...(schema && { options: `-c search_path=${schema}` }),
    },
    { schema },
  );
}
