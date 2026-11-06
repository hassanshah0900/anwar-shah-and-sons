import type { INestApplication } from '@nestjs/common';
import { and, eq, inArray, notExists } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Database } from '../../src/db/connection.js';
import { DATABASE } from '../../src/db/database.module.js';
import {
  categories,
  optionTypes,
  products,
  productVariants,
  users,
  variantOptionValues,
} from '../../src/db/schema/index.js';

/** The app's own database client, pointed at the e2e schema. */
export function testDatabase(app: INestApplication): Database {
  return app.get<Database>(DATABASE);
}

/** Clears catalog data in dependency order (products before what they reference). */
export async function resetCatalog(db: Database): Promise<void> {
  await db.delete(products);
  await db.delete(optionTypes);
  // Children first: a category with sub-categories can't be deleted.
  const child = alias(categories, 'child');
  for (let depth = 0; depth < 10 && (await db.$count(categories)) > 0; depth++) {
    await db
      .delete(categories)
      .where(
        notExists(db.select({ id: child.id }).from(child).where(eq(child.parentId, categories.id))),
      );
  }
}

/** Gives a signed-up user the admin role. */
export async function makeAdmin(db: Database, email: string): Promise<void> {
  await db.update(users).set({ role: 'admin' }).where(eq(users.email, email));
}

/** The product's variant with this option value, or its first variant. */
export async function variantOf(db: Database, productId: string, optionValueId?: string) {
  const [variant] = await db
    .select({ id: productVariants.id, stock: productVariants.stock })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, productId),
        optionValueId === undefined
          ? undefined
          : inArray(
              productVariants.id,
              db
                .select({ id: variantOptionValues.variantId })
                .from(variantOptionValues)
                .where(eq(variantOptionValues.optionValueId, optionValueId)),
            ),
      ),
    );
  if (!variant) throw new Error('No such variant');
  return variant;
}

/** A variant's current stock. */
export async function stockOf(db: Database, variantId: string): Promise<number> {
  const [variant] = await db
    .select({ stock: productVariants.stock })
    .from(productVariants)
    .where(eq(productVariants.id, variantId));
  if (!variant) throw new Error('No such variant');
  return variant.stock;
}
