import { z } from 'zod';
import { optionKindSchema } from './catalog.js';
import { slugSchema } from './slug.js';

const idSchema = z.string().min(1);
/** An amount in the store currency's minor unit (see money.ts). */
const moneySchema = z
  .number({
    error: (issue) => (issue.input === undefined ? 'Enter an amount' : 'Enter a valid amount'),
  })
  .int('Use a whole amount')
  .nonnegative('Use a positive amount');

/** Draft products are hidden from the store; archived ones are retired but kept. */
export const productStatuses = ['draft', 'active', 'archived'] as const;
export const productStatusSchema = z.enum(productStatuses);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const MAX_PRODUCT_OPTIONS = 3;

// ─── Responses ──────────────────────────────────────────────────────────────

export const variantSchema = z.object({
  id: idSchema,
  sku: z.string(),
  /** Overrides the product price when set. */
  price: moneySchema.nullable(),
  stock: z.number().int().nonnegative(),
  position: z.number().int(),
  optionValueIds: z.array(idSchema),
});
export type Variant = z.infer<typeof variantSchema>;

export const productOptionSchema = z.object({
  optionTypeId: idSchema,
  name: z.string(),
  kind: optionKindSchema,
  position: z.number().int(),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

export const productSchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: slugSchema,
  description: z.string().nullable(),
  categoryId: idSchema,
  status: productStatusSchema,
  price: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  options: z.array(productOptionSchema),
  variants: z.array(variantSchema),
});
export type Product = z.infer<typeof productSchema>;

export const productSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: slugSchema,
  status: productStatusSchema,
  price: moneySchema,
  category: z.object({ id: idSchema, name: z.string() }),
  variantCount: z.number().int().nonnegative(),
  totalStock: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
});
export type ProductSummary = z.infer<typeof productSummarySchema>;

export const productListSchema = z.object({
  products: z.array(productSummarySchema),
  total: z.number().int().nonnegative(),
});
export type ProductList = z.infer<typeof productListSchema>;

export const productListQuerySchema = z.object({
  status: productStatusSchema.optional(),
  categoryId: idSchema.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

// ─── Inputs ─────────────────────────────────────────────────────────────────

const optionTypeIdsSchema = z
  .array(idSchema)
  .max(MAX_PRODUCT_OPTIONS, `Use at most ${MAX_PRODUCT_OPTIONS} options`)
  .refine((ids) => new Set(ids).size === ids.length, 'Choose each option once');

// No defaults here: partial updates must not fill in missing fields.
const productFields = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  /** Derived from the name when omitted. */
  slug: slugSchema.optional(),
  description: z.string().trim().max(5000).nullish(),
  categoryId: idSchema.min(1, 'Choose a category'),
  status: productStatusSchema,
  price: moneySchema,
  /** The "was" price shown struck through; must be above the price. */
  compareAtPrice: moneySchema.nullish(),
  /** Option types this product varies by, in display order. */
  optionTypeIds: optionTypeIdsSchema,
});

const compareAtAbovePrice = (input: { price?: number; compareAtPrice?: number | null }) =>
  input.compareAtPrice == null || input.price === undefined || input.compareAtPrice > input.price;
const compareAtMessage = {
  message: 'The compare-at price must be higher than the price',
  path: ['compareAtPrice'],
};

export const productInputSchema = productFields
  .extend({
    status: productStatusSchema.default('draft'),
    optionTypeIds: optionTypeIdsSchema.default([]),
  })
  .refine(compareAtAbovePrice, compareAtMessage);
export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productFields
  .partial()
  .refine(compareAtAbovePrice, compareAtMessage);
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(
    z
      .string()
      .min(1, 'Enter a SKU')
      .max(64)
      .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, 'Use letters, numbers and single hyphens'),
  );

const stockSchema = z
  .number({ error: 'Enter a whole number' })
  .int('Enter a whole number')
  .nonnegative('Stock cannot be negative');

export const variantInputSchema = z.object({
  sku: skuSchema,
  price: moneySchema.nullish(),
  stock: stockSchema.default(0),
  /** One value for each of the product's options. */
  optionValueIds: z.array(idSchema).default([]),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

// Built without defaults so a partial update never resets stock.
export const variantUpdateSchema = z
  .object({ sku: skuSchema, price: moneySchema.nullable(), stock: stockSchema })
  .partial();
export type VariantUpdate = z.infer<typeof variantUpdateSchema>;
