import { describe, expect, it } from 'vitest';
import { formatPrice, parsePrice, priceInputValue } from './money';

describe('money in the web app', () => {
  it('parses whole-rupee amounts and rejects decimals for PKR', () => {
    expect(parsePrice('4,990', 'PKR')).toBe(4990);
    expect(parsePrice('49.90', 'PKR')).toBeNaN();
  });

  it('parses cents for USD', () => {
    expect(parsePrice('49.90', 'USD')).toBe(4990);
    expect(parsePrice('49.999', 'USD')).toBeNaN();
  });

  it('treats a blank field as missing and text as invalid', () => {
    expect(parsePrice('  ', 'PKR')).toBeUndefined();
    expect(parsePrice('free', 'PKR')).toBeNaN();
  });

  it('round-trips through the input value', () => {
    expect(priceInputValue(4990, 'USD')).toBe('49.90');
    expect(priceInputValue(4990, 'PKR')).toBe('4990');
    expect(priceInputValue(null, 'PKR')).toBe('');
  });

  it('formats for the store', () => {
    expect(formatPrice(4990, { currency: 'PKR', locale: 'en-PK' })).toBe('Rs 4,990');
  });
});
