import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { formatOrderDate, OrderDetails } from '@/components/orders/order-details';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyOrder } from '@/lib/api/orders';
import { ApiError } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { requireUser } from '@/lib/auth/session';

type Props = PageProps<'/account/orders/[number]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order #${(await params).number}`, robots: { index: false } };
}

export default function OrderPage({ params, searchParams }: Props) {
  return (
    <main className="page-container py-16">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <OrderView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function OrderView({ params, searchParams }: Props) {
  const { number: raw } = await params;
  await requireUser(`/account/orders/${raw}`);
  const number = Number(raw);
  if (!Number.isInteger(number) || number < 1) notFound();

  const [order, store, { placed }] = await Promise.all([
    getMyOrder(number).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getStoreConfig(),
    searchParams,
  ]);

  return (
    <div className="flex flex-col gap-10">
      {placed && (
        <div role="status" className="flex gap-3 rounded-md border p-5">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-medium">Thank you, your order is placed.</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ll confirm it shortly. Pay in cash when it arrives.
            </p>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/account/orders" className="hover:text-foreground">
            Your orders
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-5xl">Order #{order.number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Placed on {formatOrderDate(order.createdAt, store)}
        </p>
      </header>

      <OrderDetails order={order} store={store} />
    </div>
  );
}
