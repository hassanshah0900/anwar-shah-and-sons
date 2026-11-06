import type { ConfigService } from '@nestjs/config';
import { toMinorUnits, type StoreConfig } from '@repo/shared';
import type { Env } from '../config/env.js';

/** The store settings from the environment, with amounts in minor units. */
export function storeConfig(config: ConfigService<Env, true>): StoreConfig {
  const currency = config.get('STORE_CURRENCY', { infer: true });
  const freeOver = config.get('FREE_SHIPPING_OVER', { infer: true });
  return {
    currency,
    locale: config.get('STORE_LOCALE', { infer: true }),
    paymentMethods: config.get('STRIPE_SECRET_KEY', { infer: true }) ? ['card', 'cod'] : ['cod'],
    shipping: {
      flatRate: toMinorUnits(config.get('SHIPPING_FLAT_RATE', { infer: true }), currency),
      freeOver: freeOver === undefined ? null : toMinorUnits(freeOver, currency),
    },
  };
}
