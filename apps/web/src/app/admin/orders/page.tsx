import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { orderListQuerySchema, orderStatuses, type OrderListQuery } from '@repo/shared';
import { formatOrderDate } from '@/components/orders/order-details';
import { OrderStatusBadge, orderStatusLabels } from '@/components/orders/order-status-badge';
import { Pagination } from '@/components/shop/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAdminOrders } from '@/lib/api/orders';
import { getStoreConfig } from '@/lib/api/store';
import { requireAdmin } from '@/lib/auth/session';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Orders' };

export default function AdminOrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  return (
    <main className="page-container py-12">
      <h1 className="text-4xl">Orders</h1>
      <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Orders({ searchParams }: Pick<PageProps<'/admin/orders'>, 'searchParams'>) {
  await requireAdmin('/admin/orders');
  const raw = await searchParams;
  const parsed = orderListQuerySchema.safeParse({ status: raw.status, page: raw.page });
  const query: OrderListQuery = parsed.success ? parsed.data : { page: 1, pageSize: 25 };

  const [{ orders, total }, store] = await Promise.all([getAdminOrders(query), getStoreConfig()]);
  const href = (changes: Partial<OrderListQuery>) => {
    const next = { status: query.status, page: query.page, ...changes };
    const params = new URLSearchParams();
    if (next.status) params.set('status', next.status);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    return `/admin/orders${params.size ? `?${params}` : ''}`;
  };

  return (
    <>
      <nav aria-label="Filter by status" className="mt-8 flex flex-wrap gap-1">
        {[undefined, ...orderStatuses].map((status) => (
          <Link
            key={status ?? 'all'}
            href={href({ status, page: 1 })}
            aria-current={query.status === status ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              query.status === status
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {status ? orderStatusLabels[status] : 'All'}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-6 border border-dashed p-10 text-center text-sm text-muted-foreground">
          {query.status ? `No ${query.status} orders.` : 'No orders yet.'}
        </p>
      ) : (
        <div className="mt-6 border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.number}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/orders/${order.number}`}
                      className="underline-offset-4 hover:underline"
                    >
                      #{order.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatOrderDate(order.createdAt, store)}
                  </TableCell>
                  <TableCell>
                    <span className="block">{order.customerName}</span>
                    <span className="block text-xs text-muted-foreground">{order.email}</span>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{order.itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(order.total, store)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'order' : 'orders'}
        </p>
        <Pagination
          page={query.page}
          pages={Math.ceil(total / query.pageSize)}
          href={(page) => href({ page })}
        />
      </div>
    </>
  );
}
