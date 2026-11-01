import { describe, expect, it } from 'vitest';
import { slugify, slugSchema } from './slug.js';

describe('slugify', () => {
  it.each([
    ["Women's Kurtas & Tops", 'womens-kurtas-tops'],
    ['  Extra   Large  ', 'extra-large'],
    ['Crème Brûlée', 'creme-brulee'],
    ['XL', 'xl'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(slugSchema.safeParse(expected).success).toBe(true);
  });

  it('rejects malformed slugs', () => {
    for (const bad of ['Upper', 'double--hyphen', '-leading', 'trailing-', 'spa ce']) {
      expect(slugSchema.safeParse(bad).success).toBe(false);
    }
  });
});
