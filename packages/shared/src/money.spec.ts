import { describe, expect, it } from 'vitest';
import { currencyExponent, formatMoney, fromMinorUnits, toMinorUnits } from './money.js';

describe('money', () => {
  it('uses the currency exponent from Intl', () => {
    expect(currencyExponent('PKR')).toBe(0);
    expect(currencyExponent('USD')).toBe(2);
  });

  it('converts between amounts and minor units', () => {
    expect(toMinorUnits(4990, 'PKR')).toBe(4990);
    expect(toMinorUnits(49.9, 'USD')).toBe(4990);
    expect(fromMinorUnits(4990, 'USD')).toBe(49.9);
  });

  it('avoids floating point drift', () => {
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30);
  });

  it('formats for the store locale', () => {
    // Intl separates the symbol with a non-breaking space.
    expect(formatMoney(4990, 'PKR', 'en-PK')).toBe('Rs\u00a04,990');
    expect(formatMoney(4990, 'USD', 'en-US')).toBe('$49.90');
  });
});
