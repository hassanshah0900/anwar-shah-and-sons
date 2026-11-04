import 'server-only';
import {
  orderListSchema,
  orderSchema,
  type Checkout,
  type Order,
  type OrderList,
  type OrderListQuery,
} from '@repo/shared';
import { apiRequest } from './server';

function listParams(query: Partial<OrderListQuery>): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  return params.size ? `?${params}` : '';
}

/** Places an order from the signed-in customer's cart. */
export function placeOrder(input: Checkout): Promise<Order> {
  return apiRequest('/api/v1/checkout', orderSchema, { method: 'POST', body: input });
}

export function getMyOrders(query: Partial<OrderListQuery> = {}): Promise<OrderList> {
  return apiRequest(`/api/v1/orders${listParams(query)}`, orderListSchema);
}

export function getMyOrder(number: number): Promise<Order> {
  return apiRequest(`/api/v1/orders/${number}`, orderSchema);
}
