import { cartesian, combinationKey, skuFor } from './variants.service.js';

describe('variant helpers', () => {
  it('builds every combination in option order', () => {
    expect(
      cartesian([
        ['s', 'm'],
        ['black', 'ivory'],
      ]),
    ).toEqual([
      ['s', 'black'],
      ['s', 'ivory'],
      ['m', 'black'],
      ['m', 'ivory'],
    ]);
  });

  it('yields a single empty combination when there are no options', () => {
    expect(cartesian([])).toEqual([[]]);
  });

  it('keys combinations independently of value order', () => {
    expect(combinationKey(['b', 'a'])).toBe(combinationKey(['a', 'b']));
  });

  it('derives readable SKUs within the length limit', () => {
    expect(skuFor('lawn-kurta', ['m', 'black'])).toBe('LAWN-KURTA-M-BLACK');
    expect(skuFor('x'.repeat(70), ['m'])).toHaveLength(64);
  });
});
