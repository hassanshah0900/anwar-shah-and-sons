import { z } from 'zod';
import { optionKindSchema } from './catalog.js';
import { slugSchema } from './slug.js';

/**
 * Public catalog contracts. Only active products appear, and stock is exposed
 * as a level rather than a count, so inventory figures stay private.
 */

const idSchema = z.string().min(1);
const moneySchema = z.number().int().nonnegative();

export const LOW_STOCK_THRESHOLD = 3;
export const stockLevels = ['in_stock', 'low_stock', 'out_of_stock'] as const;
export const stockLevelSchema = z.enum(stockLevels);
export type StockLevel = z.infer<typeof stockLevelSchema>;

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'out_of_stock';
  return stock <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock';
}

const imageSchema = z.object({ key: z.string(), alt: z.string() });

const swatchSchema = z.object({
  label: z.string(),
  slug: slugSchema,
  colorHex: z.string().nullable(),
});

// ─── Listing ────────────────────────────────────────────────────────────────

export const productCardSchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: slugSchema,
  /** Lowest and highest variant price; equal when all variants cost the same. */
  priceFrom: moneySchema,
  priceTo: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  image: imageSchema.nullable(),
  /** Colour choices, for swatches on the card. */
  colors: z.array(swatchSchema),
  inStock: z.boolean(),
});
export type ProductCard = z.infer<typeof productCardSchema>;

export const facetSchema = z.object({
  name: z.string(),
  slug: slugSchema,
  kind: optionKindSchema,
  values: z.array(swatchSchema),
});
export type Facet = z.infer<typeof facetSchema>;

export const productListingSchema = z.object({
  products: z.array(productCardSchema),
  total: z.number().int().nonnegative(),
  /** Options available among the products in scope, before filters are applied. */
  facets: z.array(facetSchema),
  price: z.object({ min: moneySchema, max: moneySchema }).nullable(),
});
export type ProductListing = z.infer<typeof productListingSchema>;

export const productSorts = ['newest', 'price-asc', 'price-desc'] as const;
export const productSortSchema = z.enum(productSorts);
export type ProductSort = z.infer<typeof productSortSchema>;

/** Query values may arrive once or repeated; normalise to an array. */
const repeated = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
    z.array(schema),
  );

/**
 * `option` filters use "<option-slug>:<value-slug>", e.g. option=size:m&option=size:l
 * &option=colour:black. Values of one option are alternatives (OR); different
 * options must all match (AND).
 */
export const productListingQuerySchema = z.object({
  category: slugSchema.optional(),
  q: z.string().trim().max(100).optional(),
  option: repeated(z.string().regex(/^[a-z0-9-]+:[a-z0-9-]+$/)).default([]),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  /** Only products whose compare-at price is above their price. */
  onSale: z.stringbool().optional(),
  sort: productSortSchema.default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});
export type ProductListingQuery = z.infer<typeof productListingQuerySchema>;

// ─── Product page ───────────────────────────────────────────────────────────

export const productDetailSchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: slugSchema,
  description: z.string().nullable(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  /** From the top-level category down to the product's own. */
  breadcrumbs: z.array(z.object({ name: z.string(), slug: slugSchema })),
  /** Each option with only the values some variant uses, in display order. */
  options: z.array(
    z.object({
      name: z.string(),
      slug: slugSchema,
      kind: optionKindSchema,
      values: z.array(swatchSchema.extend({ id: idSchema })),
    }),
  ),
  variants: z.array(
    z.object({
      id: idSchema,
      optionValueIds: z.array(idSchema),
      /** The price to pay: the variant's override or the product price. */
      price: moneySchema,
      stockLevel: stockLevelSchema,
    }),
  ),
  images: z.array(imageSchema.extend({ optionValueId: idSchema.nullable() })),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;
