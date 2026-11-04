import 'server-only';
import { connection } from 'next/server';
import { cache } from 'react';
import type { z } from 'zod';
import {
  categoryListSchema,
  productDetailSchema,
  productListingSchema,
  type Category,
  type ProductDetail,
  type ProductListing,
  type ProductListingQuery,
} from '@repo/shared';
import { getServerEnv } from '@/lib/env';
import { ApiError } from './server';

/**
 * Public catalog reads. They send no cookies, since the endpoints are the same
 * for every visitor, and run at request time so builds never need the API.
 */
async function publicRequest<T extends z.ZodType>(path: string, schema: T): Promise<z.output<T>> {
  await connection();

  const { API_URL } = getServerEnv();
  const response = await fetch(new URL(path, API_URL), { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new ApiError(response.status, `Request failed (HTTP ${response.status})`);
  }
  return schema.parse(await response.json());
}

/** Every category, memoised per request (the header, footer and page all need it). */
export const getCategories = cache(async (): Promise<Category[]> => {
  const { categories } = await publicRequest('/api/v1/categories', categoryListSchema);
  return categories;
});

export function getProductListing(query: Partial<ProductListingQuery>): Promise<ProductListing> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== '') params.append(key, String(item));
    }
  }
  return publicRequest(`/api/v1/products?${params}`, productListingSchema);
}

export function getProductDetail(slug: string): Promise<ProductDetail> {
  return publicRequest(`/api/v1/products/${encodeURIComponent(slug)}`, productDetailSchema);
}
