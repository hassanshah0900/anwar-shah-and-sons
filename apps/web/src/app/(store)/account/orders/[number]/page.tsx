import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { canCustomerCancel, isAwaitingPayment } from '@repo/shared';
import { formatOrderDate, OrderDetails } from '@/components/orders/order-details';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyOrder } from '@/lib/api/orders';
import { ApiError } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { requireUser } from '@/lib/auth/session';
import { PageBreadcrumbs } from '@/components/layout/page-breadcrumbs';
import { CancelOrder } from './cancel-order';
import { PayNow } from './pay-now';

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

  const [order, store, { placed, paid }] = await Promise.all([
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
        <Notice title="Thank you, your order is placed.">
          We&apos;ll confirm it shortly. Pay in cash when it arrives.
        </Notice>
      )}
      {paid && order.paymentStatus === 'paid' && (
        <Notice title="Thank you, we've received your payment.">
          We&apos;re getting your order ready and have emailed you the details.
        </Notice>
      )}
      {isAwaitingPayment(order) &&
        (paid ? (
          <Notice title="We're confirming your payment.">
            This usually takes a moment. Refresh this page to see the latest.
          </Notice>
        ) : (
          <PayNow number={order.number} />
        ))}

      <header className="flex flex-col gap-3">
        <PageBreadcrumbs crumbs={[{ name: 'Your orders', href: '/account/orders' }]} />
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-5xl">Order #{order.number}</h1>
          <OrderStatusBadge order={order} />
        </div>
        <p className="text-sm text-muted-foreground">
          Placed on {formatOrderDate(order.createdAt, store)}
        </p>
      </header>

      <OrderDetails order={order} store={store} />

      {canCustomerCancel(order) && (
        <CancelOrder number={order.number} paid={order.paymentStatus === 'paid'} />
      )}
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Alert role="status" className="gap-x-3 gap-y-1 p-5 text-base">
      <CheckCircle2Icon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
