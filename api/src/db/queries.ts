import { NotFoundException } from '@nestjs/common';
import { ilike, max, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Database } from './connection.js';

/** Either the database itself or a transaction on it; both run the same queries. */
export type Queryable = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

/** The first row, or a 404 when there is none (e.g. updating or deleting an unknown id). */
export function found<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new NotFoundException('Not found');
  return row;
}

/** Fails with a 404 unless the lookup found something. */
export function orNotFound<T>(row: T | undefined): T {
  if (row === undefined) throw new NotFoundException('Not found');
  return row;
}

/**
 * Update values plus a fresh updatedAt. Drizzle skips undefined fields, and refuses an
 * update with none left; stamping the time keeps "last changed" right either way.
 */
export function touch<T extends object>(values: T): T & { updatedAt: Date } {
  return { ...values, updatedAt: new Date() };
}

/** Case-insensitive "contains", treating % and _ in the search as plain characters. */
export function containsInsensitive(column: PgColumn, search: string): SQL {
  return ilike(column, `%${search.replace(/[\\%_]/g, '\\$&')}%`);
}

/** The position after the last one among the rows `where` selects, so new rows go last. */
export async function nextPosition(
  db: Queryable,
  table: PgTable & { position: PgColumn },
  where?: SQL,
): Promise<number> {
  const [row] = await db
    .select({ last: max(table.position) })
    .from(table)
    .where(where);
  return ((row?.last as number | null | undefined) ?? -1) + 1;
}
