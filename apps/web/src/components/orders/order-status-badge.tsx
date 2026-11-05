import { isAwaitingPayment, type OrderStatus, type OrderSummary } from '@repo/shared';
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

export function OrderStatusBadge({
  order,
}: {
  order: Pick<OrderSummary, 'status' | 'paymentMethod' | 'paymentStatus'>;
}) {
  return (
    <Badge variant={variants[order.status]}>
      {isAwaitingPayment(order) ? 'Awaiting payment' : orderStatusLabels[order.status]}
    </Badge>
  );
}
