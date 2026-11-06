import { createId } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import { foreignKey, text, timestamp, type PgColumn } from 'drizzle-orm/pg-core';

/** A text primary key filled with a new CUID2 when the row is inserted. */
export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => createId());

/** Timestamps are stored with millisecond precision and no time zone (always UTC). */
export const timestamp3 = (name: string) => timestamp(name, { precision: 3, mode: 'date' });

export const createdAt = () =>
  timestamp3('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);

/** Set by the application on every insert and update. */
export const updatedAt = () =>
  timestamp3('updated_at')
    .notNull()
    .$onUpdate(() => new Date());

/**
 * A named foreign key that follows the referenced row's id when it changes. `onDelete`
 * decides what happens to this row when the referenced one is deleted.
 */
export const fk = (
  name: string,
  column: PgColumn,
  references: PgColumn,
  onDelete: 'cascade' | 'restrict' | 'set null',
) =>
  foreignKey({ name, columns: [column], foreignColumns: [references] })
    .onDelete(onDelete)
    .onUpdate('cascade');
