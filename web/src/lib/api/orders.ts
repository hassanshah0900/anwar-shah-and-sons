import 'server-only';
import {
  checkoutResultSchema,
  orderListSchema,
  orderSchema,
  paymentLinkSchema,
  type Checkout,
  type CheckoutResult,
  type Order,
  type OrderList,
  type OrderListQuery,
  type OrderStatus,
  type PaymentLink,
} from '@repo/shared';
import { apiRequest } from './server';

function listParams(query: Partial<OrderListQuery>): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.refundDue) params.set('refundDue', 'true');
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  return params.size ? `?${params}` : '';
}

/** Places an order from the signed-in customer's cart. */
export function placeOrder(input: Checkout): Promise<CheckoutResult> {
  return apiRequest('/api/v1/checkout', checkoutResultSchema, { method: 'POST', body: input });
}

/** Cancels the signed-in customer's own order. */
export function cancelMyOrder(number: number): Promise<Order> {
  return apiRequest(`/api/v1/orders/${number}/cancel`, orderSchema, { method: 'POST' });
}

/** Where the customer can finish paying for a card order. */
export function resumePayment(number: number): Promise<PaymentLink> {
  return apiRequest(`/api/v1/orders/${number}/payment`, paymentLinkSchema, { method: 'POST' });
}

export function getMyOrders(query: Partial<OrderListQuery> = {}): Promise<OrderList> {
  return apiRequest(`/api/v1/orders${listParams(query)}`, orderListSchema);
}

export function getMyOrder(number: number): Promise<Order> {
  return apiRequest(`/api/v1/orders/${number}`, orderSchema);
}

export function getAdminOrders(query: Partial<OrderListQuery> = {}): Promise<OrderList> {
  return apiRequest(`/api/v1/admin/orders${listParams(query)}`, orderListSchema);
}

export function getAdminOrder(number: number): Promise<Order> {
  return apiRequest(`/api/v1/admin/orders/${number}`, orderSchema);
}

export function retryRefund(number: number): Promise<Order> {
  return apiRequest(`/api/v1/admin/orders/${number}/refund`, orderSchema, { method: 'POST' });
}

export function updateOrderStatus(number: number, status: OrderStatus): Promise<Order> {
  return apiRequest(`/api/v1/admin/orders/${number}`, orderSchema, {
    method: 'PATCH',
    body: { status },
  });
}
