import type { Metadata } from 'next';
import { isRefundDue } from '@repo/shared';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { formatOrderDate, OrderDetails } from '@/components/orders/order-details';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminOrder } from '@/lib/api/orders';
import { ApiError } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { requireAdmin } from '@/lib/auth/session';
import { PageBreadcrumbs } from '@/components/layout/page-breadcrumbs';
import { RetryRefund } from './retry-refund';
import { OrderStatusActions } from './status-actions';

type Props = PageProps<'/admin/orders/[number]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order #${(await params).number}` };
}

export default function AdminOrderPage({ params }: Props) {
  return (
    <main className="page-container py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <OrderView params={params} />
      </Suspense>
    </main>
  );
}

async function OrderView({ params }: Pick<Props, 'params'>) {
  const { number: raw } = await params;
  await requireAdmin(`/admin/orders/${raw}`);
  const number = Number(raw);
  if (!Number.isInteger(number) || number < 1) notFound();

  const [order, store] = await Promise.all([
    getAdminOrder(number).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getStoreConfig(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <PageBreadcrumbs crumbs={[{ name: 'Orders', href: '/admin/orders' }]} />
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-4xl">Order #{order.number}</h1>
          <OrderStatusBadge order={order} />
        </div>
        <p className="text-sm text-muted-foreground">
          Placed on {formatOrderDate(order.createdAt, store)} by {order.address.fullName} (
          <a href={`mailto:${order.email}`} className="underline underline-offset-4">
            {order.email}
          </a>
          )
        </p>
        <OrderStatusActions order={order} />
        {isRefundDue(order) && <RetryRefund number={order.number} />}
      </header>

      <OrderDetails order={order} store={store} showSku />
    </div>
  );
}
