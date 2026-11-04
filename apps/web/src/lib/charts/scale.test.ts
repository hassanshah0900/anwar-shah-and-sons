import { describe, expect, it } from 'vitest';
import { formatTick, niceMax } from './scale';

describe('niceMax', () => {
  it('rounds up to a clean axis top', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(9500)).toBe(10_000);
    expect(niceMax(12_000)).toBe(20_000);
    expect(niceMax(21_000)).toBe(25_000);
    expect(niceMax(25_000)).toBe(25_000);
  });
});

describe('formatTick', () => {
  it('writes small numbers in full and large ones compactly', () => {
    expect(formatTick(5000, 'en')).toBe('5,000');
    expect(formatTick(25_000, 'en')).toBe('25K');
  });
});
