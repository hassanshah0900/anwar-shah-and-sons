import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { storeConfig } from './store-config.js';

const configWith = (env: Partial<Env>) =>
  ({
    get: (key: keyof Env) =>
      ({ STORE_CURRENCY: 'PKR', STORE_LOCALE: 'en-PK', SHIPPING_FLAT_RATE: 0, ...env })[key],
  }) as unknown as ConfigService<Env, true>;

describe('storeConfig', () => {
  it('offers only cash on delivery without a Stripe key', () => {
    expect(storeConfig(configWith({})).paymentMethods).toEqual(['cod']);
  });

  it('offers cards when a Stripe key is set', () => {
    expect(storeConfig(configWith({ STRIPE_SECRET_KEY: 'sk_test_1' })).paymentMethods).toEqual([
      'card',
      'cod',
    ]);
  });
});
