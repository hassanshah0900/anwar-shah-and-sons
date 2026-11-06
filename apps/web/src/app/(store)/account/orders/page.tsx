import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { formatOrderDate } from '@/components/orders/order-details';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Pagination } from '@/components/shop/pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyOrders } from '@/lib/api/orders';
import { getStoreConfig } from '@/lib/api/store';
import { requireUser } from '@/lib/auth/session';
import { formatPrice } from '@/lib/money';
import { PageBreadcrumbs } from '@/components/layout/page-breadcrumbs';

export const metadata: Metadata = {
  title: 'Your orders',
  robots: { index: false },
};

const PAGE_SIZE = 20;

export default function OrdersPage({ searchParams }: PageProps<'/account/orders'>) {
  return (
    <main className="page-container py-16">
      <PageBreadcrumbs crumbs={[{ name: 'Your account', href: '/account' }]} />
      <h1 className="mt-3 text-5xl">Your orders</h1>
      <Suspense fallback={<Skeleton className="mt-10 h-64 w-full" />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Orders({ searchParams }: Pick<PageProps<'/account/orders'>, 'searchParams'>) {
  await requireUser('/account/orders');
  const raw = Number((await searchParams).page);
  const page = Number.isInteger(raw) && raw > 1 ? raw : 1;
  const [{ orders, total }, store] = await Promise.all([
    getMyOrders({ page, pageSize: PAGE_SIZE }),
    getStoreConfig(),
  ]);

  if (total === 0) {
    return (
      <div className="mt-10 flex flex-col items-start gap-6 border-t pt-10">
        <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
        <Button asChild>
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-8">
      <ul className="divide-y border-y">
        {orders.map((order) => (
          <li key={order.number}>
            <Link
              href={`/account/orders/${order.number}`}
              className="grid grid-cols-2 items-center gap-x-4 gap-y-2 py-5 transition-colors hover:bg-muted/50 sm:grid-cols-[8rem_1fr_auto_8rem] sm:px-2"
            >
              <span className="font-medium">Order #{order.number}</span>
              <span className="text-right text-sm text-muted-foreground sm:text-left">
                {formatOrderDate(order.createdAt, store)} · {order.itemCount}{' '}
                {order.itemCount === 1 ? 'item' : 'items'}
              </span>
              <span>
                <OrderStatusBadge order={order} />
              </span>
              <span className="text-right text-sm tabular-nums">
                {formatPrice(order.total, store)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pages={Math.ceil(total / PAGE_SIZE)}
        href={(target) => (target > 1 ? `/account/orders?page=${target}` : '/account/orders')}
      />
    </div>
  );
}
