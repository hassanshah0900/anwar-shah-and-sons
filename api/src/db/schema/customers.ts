import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { products } from './catalog.js';
import { createdAt, fk, id, updatedAt } from './columns.js';

/** A customer's saved shipping address. At most one per customer is the default. */
export const addresses = pgTable(
  'addresses',
  {
    id: id(),
    userId: text('user_id').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city').notNull(),
    postalCode: text('postal_code'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('addresses_user_id_idx').on(t.userId),
    uniqueIndex('addresses_one_default_per_user')
      .on(t.userId)
      .where(sql`${t.isDefault}`),
    fk('addresses_user_id_fkey', t.userId, users.id, 'cascade'),
  ],
);

/**
 * A customer's rating of a product they bought, one per customer and product. A trigger
 * keeps the product's reviewCount and ratingTotal in step (see the baseline migration).
 */
export const reviews = pgTable(
  'reviews',
  {
    id: id(),
    productId: text('product_id').notNull(),
    userId: text('user_id').notNull(),
    /** 1 to 5 stars. */
    rating: integer('rating').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('reviews_product_id_user_id_key').on(t.productId, t.userId),
    index('reviews_product_id_created_at_idx').on(t.productId, t.createdAt),
    index('reviews_rating_created_at_idx').on(t.rating, t.createdAt),
    fk('reviews_product_id_fkey', t.productId, products.id, 'cascade'),
    fk('reviews_user_id_fkey', t.userId, users.id, 'cascade'),
    check('reviews_rating_check', sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);
