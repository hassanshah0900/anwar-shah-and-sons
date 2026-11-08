import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, max, type SQL } from 'drizzle-orm';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import pg from 'pg';
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

/** A new order must hold exactly the items there are now; otherwise the page was stale. */
export function assertSameItems(ids: string[], current: string[]): void {
  const existing = new Set(current);
  if (ids.length !== existing.size || ids.some((id) => !existing.has(id))) {
    throw new BadRequestException('The list has changed. Reload the page and try again.');
  }
}

/**
 * Saves a list's new order: `ids` must be exactly the rows `scope` selects, and each
 * gets its index as its position. Run it in a transaction so the order changes at once.
 */
export async function saveOrder(
  db: Queryable,
  table: PgTable & { id: PgColumn; position: PgColumn },
  scope: SQL | undefined,
  ids: string[],
): Promise<void> {
  const rows = await db.select({ id: table.id }).from(table).where(scope);
  assertSameItems(
    ids,
    rows.map((row) => row.id as string),
  );
  for (const [position, id] of ids.entries()) {
    await db
      .update(table)
      // Every table passed has a position column; TypeScript can't see that through the generic.
      .set({ position } as never)
      .where(and(eq(table.id, id), scope));
  }
}

/** Whether a query failed on a unique index (e.g. two identical submissions at once). */
export function isUniqueViolation(error: unknown): boolean {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  return cause instanceof pg.DatabaseError && cause.code === '23505';
}
