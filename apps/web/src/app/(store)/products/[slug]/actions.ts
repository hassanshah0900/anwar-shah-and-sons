'use server';

import { refresh } from 'next/cache';
import { reviewInputSchema } from '@repo/shared';
import { postReview } from '@/lib/api/reviews';
import { requireUser } from '@/lib/auth/session';
import { optionalText, type ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';

/** Posts the signed-in customer's review of a product they've received. */
export async function submitReview(_state: ActionState, formData: FormData): Promise<ActionState> {
  const slug = String(formData.get('slug'));
  await requireUser(`/products/${slug}`);

  const parsed = reviewInputSchema.safeParse({
    rating: formData.get('rating') || undefined,
    title: optionalText(formData, 'title'),
    body: formData.get('body') ?? '',
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await postReview(slug, parsed.data);
  } catch (error) {
    return apiErrorState(error, formData);
  }
  refresh();
  return { status: 'success', message: 'Thanks, your review is up.' };
}
