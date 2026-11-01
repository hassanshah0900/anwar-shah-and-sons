import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Builds the pg driver adapter for a connection string. The driver ignores the
 * `?schema=` parameter Prisma's CLI understands, so it is passed explicitly;
 * otherwise queries silently run against `public`.
 */
export function createPrismaAdapter(databaseUrl: string): PrismaPg {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? undefined;

  return new PrismaPg(
    { connectionString: databaseUrl, connectionTimeoutMillis: 5_000 },
    { schema },
  );
}
