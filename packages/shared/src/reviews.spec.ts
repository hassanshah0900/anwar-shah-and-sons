import { describe, expect, it } from 'vitest';
import { ratingSummary, reviewAuthor, reviewInputSchema } from './reviews.js';

describe('ratingSummary', () => {
  it('averages to one decimal, or null with no reviews', () => {
    expect(ratingSummary(3, 13)).toEqual({ average: 4.3, count: 3 });
    expect(ratingSummary(0, 0)).toEqual({ average: null, count: 0 });
  });
});

describe('reviewAuthor', () => {
  it('shortens to first name and last initial', () => {
    expect(reviewAuthor('Ayesha Khan')).toBe('Ayesha K.');
    expect(reviewAuthor(' Muhammad  Ali Raza ')).toBe('Muhammad R.');
    expect(reviewAuthor('Zara')).toBe('Zara');
  });
});

describe('reviewInputSchema', () => {
  it('needs a rating from 1 to 5 and a sentence of text', () => {
    expect(
      reviewInputSchema.safeParse({ rating: 0, body: 'Lovely fabric, fits well.' }).success,
    ).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 5, body: 'Nice' }).success).toBe(false);
    expect(reviewInputSchema.parse({ rating: '4', title: ' ', body: ' Lovely fabric. ' })).toEqual({
      rating: 4,
      title: undefined,
      body: 'Lovely fabric.',
    });
  });
});
