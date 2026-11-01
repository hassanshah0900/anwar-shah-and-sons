import { describe, expect, it } from 'vitest';
import { productListingQuerySchema, stockLevel } from './storefront.js';

describe('stockLevel', () => {
  it.each([
    [0, 'out_of_stock'],
    [2, 'low_stock'],
    [3, 'low_stock'],
    [4, 'in_stock'],
  ] as const)('%i -> %s', (stock, level) => {
    expect(stockLevel(stock)).toBe(level);
  });
});

describe('productListingQuerySchema', () => {
  it('applies defaults', () => {
    expect(productListingQuerySchema.parse({})).toEqual({
      option: [],
      sort: 'newest',
      page: 1,
      pageSize: 24,
    });
  });

  it('accepts a single or repeated option filter', () => {
    expect(productListingQuerySchema.parse({ option: 'size:m' }).option).toEqual(['size:m']);
    expect(productListingQuerySchema.parse({ option: ['size:m', 'colour:black'] }).option).toEqual([
      'size:m',
      'colour:black',
    ]);
  });

  it('rejects malformed filters and oversized pages', () => {
    expect(productListingQuerySchema.safeParse({ option: 'size' }).success).toBe(false);
    expect(productListingQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});
