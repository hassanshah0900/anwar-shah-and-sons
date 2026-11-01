import { z } from 'zod';
import { slugSchema } from './slug.js';

const idSchema = z.string().min(1);
const positionSchema = z.number().int().nonnegative();

// ─── Categories ─────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: slugSchema,
  description: z.string().nullable(),
  parentId: idSchema.nullable(),
  position: positionSchema,
});
export type Category = z.infer<typeof categorySchema>;

export const categoryListSchema = z.object({ categories: z.array(categorySchema) });
export type CategoryList = z.infer<typeof categoryListSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80),
  /** Derived from the name when omitted. */
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).nullish(),
  parentId: idSchema.nullish(),
  position: positionSchema.optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

// ─── Product options (e.g. Size, Colour) ────────────────────────────────────

/** `color` values carry a swatch colour; `text` values are plain labels. */
export const optionKinds = ['text', 'color'] as const;
export const optionKindSchema = z.enum(optionKinds);
export type OptionKind = z.infer<typeof optionKindSchema>;

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour such as #1a1a1a')
  .transform((value) => value.toLowerCase());

export const optionValueSchema = z.object({
  id: idSchema,
  label: z.string(),
  slug: slugSchema,
  colorHex: z.string().nullable(),
  position: positionSchema,
});
export type OptionValue = z.infer<typeof optionValueSchema>;

export const optionTypeSchema = z.object({
  id: idSchema,
  name: z.string(),
  slug: slugSchema,
  kind: optionKindSchema,
  position: positionSchema,
  values: z.array(optionValueSchema),
});
export type OptionType = z.infer<typeof optionTypeSchema>;

export const optionTypeListSchema = z.object({ optionTypes: z.array(optionTypeSchema) });
export type OptionTypeList = z.infer<typeof optionTypeListSchema>;

export const optionTypeInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40),
  slug: slugSchema.optional(),
  kind: optionKindSchema,
  position: positionSchema.optional(),
});
export type OptionTypeInput = z.infer<typeof optionTypeInputSchema>;

export const optionValueInputSchema = z.object({
  label: z.string().trim().min(1, 'Enter a label').max(40),
  slug: slugSchema.optional(),
  /** Required for `color` options, ignored for `text`. */
  colorHex: hexColorSchema.nullish(),
  position: positionSchema.optional(),
});
export type OptionValueInput = z.infer<typeof optionValueInputSchema>;
