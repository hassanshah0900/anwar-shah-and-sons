import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { RevenueChart } from '@/components/admin/dashboard/revenue-chart';
import { StatTile } from '@/components/admin/dashboard/stat-tile';
import { formatOrderDate } from '@/components/orders/order-details';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDashboard } from '@/lib/api/dashboard';
import { getStoreConfig } from '@/lib/api/store';
import { requireAdmin } from '@/lib/auth/session';
import { formatPrice } from '@/lib/money';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <main className="page-container py-12">
      <h1 className="text-4xl">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Overview />
      </Suspense>
    </main>
  );
}

async function Overview() {
  await requireAdmin('/admin');
  const [data, store] = await Promise.all([getDashboard(), getStoreConfig()]);
  const money = { currency: data.currency, locale: store.locale };
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

  return (
    <div className="mt-8 flex flex-col gap-12">
      {data.refundsDue > 0 && (
        <Alert variant="destructive" className="border-destructive p-4">
          <AlertDescription>
            {plural(data.refundsDue, 'refund')} failed and{' '}
            {data.refundsDue === 1 ? 'needs' : 'need'} another try.{' '}
            <Link href="/admin/orders?refundDue=true" className="underline underline-offset-4">
              View {data.refundsDue === 1 ? 'it' : 'them'}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <section
        aria-label="Key figures"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        <StatTile
          label="Revenue today"
          value={formatPrice(data.today.revenue, money)}
          detail={plural(data.today.orders, 'order')}
        />
        <StatTile
          label={`Revenue, ${data.daily.length} days`}
          value={formatPrice(data.period.revenue, money)}
          detail={plural(data.period.orders, 'order')}
        />
        <StatTile
          label="Average order"
          value={formatPrice(data.period.averageOrderValue, money)}
          detail={`Last ${data.daily.length} days`}
        />
        <StatTile
          label="To confirm"
          value={String(data.pendingOrders)}
          detail="Pending orders"
          href="/admin/orders?status=pending"
        />
        <StatTile
          label="To ship"
          value={String(data.toShip)}
          detail="Confirmed orders"
          href="/admin/orders?status=confirmed"
        />
        <StatTile
          label="Low stock"
          value={String(data.lowStockCount)}
          detail={plural(data.lowStockCount, 'variant')}
        />
      </section>

      <section aria-label="Revenue trend" className="rounded-md border p-5">
        <RevenueChart daily={data.daily} money={money} />
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="recent-heading" className="font-sans text-base font-medium tracking-normal">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="text-sm underline underline-offset-4">
              All orders
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="border border-dashed p-6 text-center text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <div className="border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <TableRow key={order.number}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/orders/${order.number}`}
                          className="underline-offset-4 hover:underline"
                        >
                          #{order.number}
                        </Link>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {formatOrderDate(order.createdAt, store)}
                        </span>
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        <OrderStatusBadge order={order} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(order.total, money)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section aria-labelledby="stock-heading" className="flex flex-col gap-4">
          <h2 id="stock-heading" className="font-sans text-base font-medium tracking-normal">
            Low stock
          </h2>
          {data.lowStock.length === 0 ? (
            <p className="border border-dashed p-6 text-center text-sm text-muted-foreground">
              Every variant is well stocked.
            </p>
          ) : (
            <div className="border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStock.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell>
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {item.productName}
                        </Link>
                        {item.variantLabel && (
                          <span className="block text-xs text-muted-foreground">
                            {item.variantLabel}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${item.stock === 0 ? 'text-destructive' : ''}`}
                      >
                        {item.stock === 0 ? 'Sold out' : item.stock}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.lowStockCount > data.lowStock.length && (
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  Showing the {data.lowStock.length} emptiest of {data.lowStockCount}.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-12" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
