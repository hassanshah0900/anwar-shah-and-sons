import 'server-only';
import {
  productListSchema,
  productSchema,
  type Product,
  type ProductList,
  type ProductListQuery,
} from '@repo/shared';
import { apiRequest } from './server';

export function getAdminProducts(query: Partial<ProductListQuery>): Promise<ProductList> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return apiRequest(`/api/v1/admin/products?${params}`, productListSchema);
}

export function getAdminProduct(id: string): Promise<Product> {
  return apiRequest(`/api/v1/admin/products/${encodeURIComponent(id)}`, productSchema);
}
