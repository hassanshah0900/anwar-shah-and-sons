import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, fk, id, updatedAt } from './columns.js';

/** Browsing hierarchy, e.g. Women > Kurtas. A category with sub-categories can't be deleted. */
export const categories = pgTable(
  'categories',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    parentId: text('parent_id'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('categories_slug_key').on(t.slug),
    index('categories_parent_id_position_idx').on(t.parentId, t.position),
    fk('categories_parent_id_fkey', t.parentId, t.id, 'restrict'),
  ],
);

export const optionKind = pgEnum('option_kind', ['text', 'color']);

/** An admin-defined product option such as Size, Colour or Fit. */
export const optionTypes = pgTable(
  'option_types',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    kind: optionKind('kind').notNull().default('text'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('option_types_slug_key').on(t.slug)],
);

/** A choice within an option type, e.g. "M" for Size or "Black" (#1a1a1a) for Colour. */
export const optionValues = pgTable(
  'option_values',
  {
    id: id(),
    optionTypeId: text('option_type_id').notNull(),
    label: text('label').notNull(),
    slug: text('slug').notNull(),
    colorHex: text('color_hex'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('option_values_slug_key').on(t.optionTypeId, t.slug),
    index('option_values_option_type_id_position_idx').on(t.optionTypeId, t.position),
    fk('option_values_option_type_id_fkey', t.optionTypeId, optionTypes.id, 'cascade'),
  ],
);

export const productStatus = pgEnum('product_status', ['draft', 'active', 'archived']);

/** Prices are integers in the store currency's minor unit (see @repo/shared money). */
export const products = pgTable(
  'products',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    categoryId: text('category_id').notNull(),
    status: productStatus('status').notNull().default('draft'),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    /** Kept in step with the product's reviews by a trigger, so listings needn't count them. */
    reviewCount: integer('review_count').notNull().default(0),
    ratingTotal: integer('rating_total').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('products_slug_key').on(t.slug),
    index('products_status_category_id_idx').on(t.status, t.categoryId),
    fk('products_category_id_fkey', t.categoryId, categories.id, 'restrict'),
    check('products_price_check', sql`${t.price} >= 0`),
    check(
      'products_compare_at_price_check',
      sql`${t.compareAtPrice} IS NULL OR ${t.compareAtPrice} > ${t.price}`,
    ),
    check('products_review_count_check', sql`${t.reviewCount} >= 0`),
  ],
);

/** An option type a product varies by, e.g. Size. Types in use can't be deleted. */
export const productOptions = pgTable(
  'product_options',
  {
    productId: text('product_id').notNull(),
    optionTypeId: text('option_type_id').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [
    primaryKey({ name: 'product_options_pkey', columns: [t.productId, t.optionTypeId] }),
    fk('product_options_product_id_fkey', t.productId, products.id, 'cascade'),
    fk('product_options_option_type_id_fkey', t.optionTypeId, optionTypes.id, 'restrict'),
  ],
);

/** A sellable combination of option values, e.g. Size M + Colour Black. */
export const productVariants = pgTable(
  'product_variants',
  {
    id: id(),
    productId: text('product_id').notNull(),
    sku: text('sku').notNull(),
    /** Overrides the product price when set. */
    price: integer('price'),
    stock: integer('stock').notNull().default(0),
    position: integer('position').notNull().default(0),
    /** Sorted option value ids joined with "+": one variant per combination. */
    combinationKey: text('combination_key').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('product_variants_sku_key').on(t.sku),
    uniqueIndex('product_variants_combination_key').on(t.productId, t.combinationKey),
    index('product_variants_product_id_position_idx').on(t.productId, t.position),
    fk('product_variants_product_id_fkey', t.productId, products.id, 'cascade'),
    check('product_variants_price_check', sql`${t.price} IS NULL OR ${t.price} >= 0`),
    check('product_variants_stock_check', sql`${t.stock} >= 0`),
  ],
);

/** The option values that define a variant. Values in use can't be deleted. */
export const variantOptionValues = pgTable(
  'variant_option_values',
  {
    variantId: text('variant_id').notNull(),
    optionValueId: text('option_value_id').notNull(),
  },
  (t) => [
    primaryKey({ name: 'variant_option_values_pkey', columns: [t.variantId, t.optionValueId] }),
    index('variant_option_values_option_value_id_idx').on(t.optionValueId),
    fk('variant_option_values_variant_id_fkey', t.variantId, productVariants.id, 'cascade'),
    fk('variant_option_values_option_value_id_fkey', t.optionValueId, optionValues.id, 'restrict'),
  ],
);

/** A product photo. The file lives in media storage under storageKey. */
export const productImages = pgTable(
  'product_images',
  {
    id: id(),
    productId: text('product_id').notNull(),
    storageKey: text('storage_key').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    alt: text('alt').notNull().default(''),
    position: integer('position').notNull().default(0),
    /** Shown only for this option value (e.g. one colour); null shows it for all. */
    optionValueId: text('option_value_id'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('product_images_storage_key_key').on(t.storageKey),
    index('product_images_product_id_position_idx').on(t.productId, t.position),
    fk('product_images_product_id_fkey', t.productId, products.id, 'cascade'),
    fk('product_images_option_value_id_fkey', t.optionValueId, optionValues.id, 'set null'),
  ],
);
