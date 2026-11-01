import 'server-only';
import { connection } from 'next/server';
import { cache } from 'react';
import { storeConfigSchema, type StoreConfig } from '@repo/shared';
import { getServerEnv } from '@/lib/env';

/**
 * Store currency and locale, memoised per request. Read at request time, not
 * prerendered: builds (CI, Docker) must not depend on the API being reachable.
 */
export const getStoreConfig = cache(async (): Promise<StoreConfig> => {
  await connection();

  const { API_URL } = getServerEnv();
  const response = await fetch(new URL('/api/v1/store', API_URL), {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Failed to load store settings (HTTP ${response.status})`);

  return storeConfigSchema.parse(await response.json());
});
