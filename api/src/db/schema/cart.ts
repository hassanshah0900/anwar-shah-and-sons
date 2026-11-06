import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, primaryKey, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { productVariants } from './catalog.js';
import { createdAt, fk, id, updatedAt } from './columns.js';

/** A shopping cart, owned by a customer (userId) or a guest (tokenHash), never neither. */
export const carts = pgTable(
  'carts',
  {
    id: id(),
    userId: text('user_id'),
    /** SHA-256 of the guest's cart token. The token itself is known only to the browser. */
    tokenHash: text('token_hash'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('carts_user_id_key').on(t.userId),
    uniqueIndex('carts_token_hash_key').on(t.tokenHash),
    fk('carts_user_id_fkey', t.userId, users.id, 'cascade'),
    check('carts_owner_check', sql`${t.userId} IS NOT NULL OR ${t.tokenHash} IS NOT NULL`),
  ],
);

/** One variant in a cart. Prices are not stored: the cart always shows the live price. */
export const cartItems = pgTable(
  'cart_items',
  {
    cartId: text('cart_id').notNull(),
    variantId: text('variant_id').notNull(),
    quantity: integer('quantity').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'cart_items_pkey', columns: [t.cartId, t.variantId] }),
    index('cart_items_variant_id_idx').on(t.variantId),
    fk('cart_items_cart_id_fkey', t.cartId, carts.id, 'cascade'),
    fk('cart_items_variant_id_fkey', t.variantId, productVariants.id, 'cascade'),
    check('cart_items_quantity_check', sql`${t.quantity} BETWEEN 1 AND 10`),
  ],
);
