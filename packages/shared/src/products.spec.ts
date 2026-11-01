import { describe, expect, it } from 'vitest';
import {
  productInputSchema,
  productUpdateSchema,
  skuSchema,
  variantInputSchema,
  variantUpdateSchema,
} from './products.js';

const base = { name: 'Lawn Kurta', categoryId: 'c1', price: 4990 };

describe('productInputSchema', () => {
  it('defaults to a draft with no options', () => {
    expect(productInputSchema.parse(base)).toMatchObject({ status: 'draft', optionTypeIds: [] });
  });

  it('requires the compare-at price to be above the price', () => {
    const result = productInputSchema.safeParse({ ...base, compareAtPrice: 4990 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['compareAtPrice']);
  });

  it('rejects fractional and negative prices', () => {
    expect(productInputSchema.safeParse({ ...base, price: 49.9 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, price: -1 }).success).toBe(false);
  });

  it('rejects repeated or too many options', () => {
    expect(productInputSchema.safeParse({ ...base, optionTypeIds: ['a', 'a'] }).success).toBe(
      false,
    );
    expect(
      productInputSchema.safeParse({ ...base, optionTypeIds: ['a', 'b', 'c', 'd'] }).success,
    ).toBe(false);
  });

  it('checks the compare-at rule on partial updates when both are given', () => {
    expect(productUpdateSchema.safeParse({ price: 5000, compareAtPrice: 4000 }).success).toBe(
      false,
    );
    expect(productUpdateSchema.safeParse({ compareAtPrice: 4000 }).success).toBe(true);
  });
});

describe('skuSchema', () => {
  it('normalises to upper case', () => {
    expect(skuSchema.parse(' kurta-m-blk ')).toBe('KURTA-M-BLK');
  });

  it('rejects spaces and symbols', () => {
    expect(skuSchema.safeParse('KURTA M').success).toBe(false);
    expect(skuSchema.safeParse('KURTA/M').success).toBe(false);
  });
});

describe('variantInputSchema', () => {
  it('defaults stock to zero and rejects negative stock', () => {
    expect(variantInputSchema.parse({ sku: 'A' }).stock).toBe(0);
    expect(variantInputSchema.safeParse({ sku: 'A', stock: -1 }).success).toBe(false);
  });
});

describe('partial updates', () => {
  it('leave out fields that were not sent instead of applying create defaults', () => {
    expect(productUpdateSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
    expect(variantUpdateSchema.parse({ price: 5490 })).toEqual({ price: 5490 });
  });
});
