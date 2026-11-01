import { describe, expect, it } from 'vitest';
import { categoryInputSchema, optionValueInputSchema } from './catalog.js';

describe('categoryInputSchema', () => {
  it('trims the name and allows the slug to be derived later', () => {
    expect(categoryInputSchema.parse({ name: '  Kurtas ' })).toEqual({ name: 'Kurtas' });
  });

  it('rejects an empty name', () => {
    expect(categoryInputSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('optionValueInputSchema', () => {
  it('normalises swatch colours to lowercase', () => {
    expect(optionValueInputSchema.parse({ label: 'Black', colorHex: '#1A1A1A' }).colorHex).toBe(
      '#1a1a1a',
    );
  });

  it('rejects malformed colours', () => {
    expect(optionValueInputSchema.safeParse({ label: 'Red', colorHex: 'red' }).success).toBe(false);
  });
});
