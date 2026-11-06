import { z } from 'zod';
import { slugSchema } from './slug.js';

/** A product's reviews at a glance: the average to one decimal, or null with none. */
export const ratingSummarySchema = z.object({
  average: z.number().min(1).max(5).nullable(),
  count: z.number().int().nonnegative(),
});
export type RatingSummary = z.infer<typeof ratingSummarySchema>;

export function ratingSummary(reviewCount: number, ratingTotal: number): RatingSummary {
  return {
    average: reviewCount > 0 ? Math.round((ratingTotal / reviewCount) * 10) / 10 : null,
    count: reviewCount,
  };
}

export const reviewSchema = z.object({
  id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  body: z.string(),
  /** First name and last initial, e.g. "Ayesha K." */
  author: z.string(),
  createdAt: z.iso.datetime(),
});
export type Review = z.infer<typeof reviewSchema>;

export const reviewListSchema = z.object({
  reviews: z.array(reviewSchema),
  total: z.number().int().nonnegative(),
  /** How many reviews gave each rating, from 5 stars down to 1. */
  distribution: z.array(z.number().int().nonnegative()).length(5),
});
export type ReviewList = z.infer<typeof reviewListSchema>;

export const REVIEW_PAGE_SIZE = 5;

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(REVIEW_PAGE_SIZE),
});
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const reviewInputSchema = z.object({
  rating: z.coerce
    .number({ error: 'Choose a rating' })
    .int()
    .min(1, 'Choose a rating')
    .max(5, 'Choose a rating'),
  title: z
    .string()
    .trim()
    .max(80, 'Keep the title under 80 characters')
    .optional()
    .transform((title) => title || undefined),
  body: z
    .string()
    .trim()
    .min(10, 'Write at least a sentence')
    .max(2000, 'Keep the review under 2,000 characters'),
});
export type ReviewInput = z.input<typeof reviewInputSchema>;

/** Whether the signed-in customer may review a product, and why not. */
export const reviewEligibilitySchema = z.object({
  canReview: z.boolean(),
  reason: z.enum(['not-purchased', 'already-reviewed']).nullable(),
});
export type ReviewEligibility = z.infer<typeof reviewEligibilitySchema>;

/** Recent well-rated reviews with their product, for the home page. */
export const reviewHighlightsSchema = z.object({
  reviews: z.array(
    reviewSchema.extend({
      product: z.object({
        name: z.string(),
        slug: slugSchema,
        image: z.object({ key: z.string(), alt: z.string() }).nullable(),
      }),
    }),
  ),
});
export type ReviewHighlights = z.infer<typeof reviewHighlightsSchema>;

/** "Ayesha Khan" → "Ayesha K."; a single name stays as it is. */
export function reviewAuthor(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? 'Customer');
}
