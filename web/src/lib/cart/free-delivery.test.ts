import { describe, expect, it } from 'vitest';
import { freeDeliveryProgress } from './free-delivery';

describe('freeDeliveryProgress', () => {
  it('is null when the store has no free delivery', () => {
    expect(freeDeliveryProgress(5000, null)).toBeNull();
  });

  it('says how much is left and how far along the bag is', () => {
    expect(freeDeliveryProgress(2500, 10000)).toEqual({ remaining: 7500, percent: 25 });
  });

  it('stops at zero left and 100% once the bag qualifies', () => {
    expect(freeDeliveryProgress(12000, 10000)).toEqual({ remaining: 0, percent: 100 });
  });
});
