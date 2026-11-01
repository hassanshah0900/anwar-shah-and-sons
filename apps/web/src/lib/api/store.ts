import 'server-only';
import { cacheLife } from 'next/cache';
import { storeConfigSchema, type StoreConfig } from '@repo/shared';
import { getServerEnv } from '@/lib/env';

/**
 * Store currency and locale. Public and set at deploy time, so it is cached
 * across requests instead of fetched for every page.
 */
export async function getStoreConfig(): Promise<StoreConfig> {
  'use cache';
  cacheLife('hours');

  const { API_URL } = getServerEnv();
  const response = await fetch(new URL('/api/v1/store', API_URL), {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Failed to load store settings (HTTP ${response.status})`);

  return storeConfigSchema.parse(await response.json());
}
