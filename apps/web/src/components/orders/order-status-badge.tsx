import type { OrderStatus } from '@repo/shared';
import { Badge } from '@/components/ui/badge';

const variants = {
  pending: 'outline',
  confirmed: 'secondary',
  shipped: 'secondary',
  delivered: 'default',
  cancelled: 'destructive',
} as const satisfies Record<OrderStatus, string>;

export const orderStatusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
} satisfies Record<OrderStatus, string>;

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={variants[status]}>{orderStatusLabels[status]}</Badge>;
}
