import 'server-only';
import {
  reviewEligibilitySchema,
  reviewHighlightsSchema,
  reviewListSchema,
  reviewSchema,
  type Review,
  type ReviewEligibility,
  type ReviewHighlights,
  type ReviewInput,
  type ReviewList,
} from '@repo/shared';
import { getSessionUser } from '@/lib/auth/session';
import { publicRequest } from './catalog';
import { apiRequest } from './server';

const path = (slug: string) => `/api/v1/products/${encodeURIComponent(slug)}/reviews`;

export function getReviews(slug: string, page = 1): Promise<ReviewList> {
  return publicRequest(`${path(slug)}${page > 1 ? `?page=${page}` : ''}`, reviewListSchema);
}

/** Whether the visitor may review the product, or null when they aren't signed in. */
export async function getReviewEligibility(slug: string): Promise<ReviewEligibility | null> {
  if (!(await getSessionUser())) return null;
  return apiRequest(`${path(slug)}/eligibility`, reviewEligibilitySchema);
}

export function postReview(slug: string, input: ReviewInput): Promise<Review> {
  return apiRequest(path(slug), reviewSchema, { method: 'POST', body: input });
}

export function getReviewHighlights(limit: number): Promise<ReviewHighlights> {
  return publicRequest(`/api/v1/reviews/highlights?limit=${limit}`, reviewHighlightsSchema);
}
