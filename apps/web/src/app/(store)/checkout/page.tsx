import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { shippingFor } from '@repo/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { getAddresses } from '@/lib/api/addresses';
import { getCart } from '@/lib/api/cart';
import { getStoreConfig } from '@/lib/api/store';
import { requireUser } from '@/lib/auth/session';
import { formatPrice } from '@/lib/money';
import { CheckoutForm } from './checkout-form';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <main className="page-container py-10">
      <h1 className="pb-10 text-4xl sm:text-5xl">Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout />
      </Suspense>
    </main>
  );
}

async function Checkout() {
  const user = await requireUser('/checkout');
  const [cart, store, savedAddresses] = await Promise.all([
    getCart(),
    getStoreConfig(),
    getAddresses(),
  ]);
  if (cart.lines.length === 0) redirect('/cart');

  const shipping = shippingFor(cart.subtotal, store.shipping);
  const total = cart.subtotal + shipping;
  const unavailable = cart.lines.filter((line) => !line.available);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-16">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Ordering as <span className="text-foreground">{user.email}</span>
        </p>
        {unavailable.length > 0 && (
          <p className="rounded-md border border-destructive p-4 text-sm text-destructive">
            Some items in your bag aren&apos;t available.{' '}
            <Link href="/cart" className="underline underline-offset-4">
              Review your bag
            </Link>{' '}
            to continue.
          </p>
        )}
        <CheckoutForm
          defaultName={user.name}
          savedAddresses={savedAddresses}
          expectedTotal={total}
          totalLabel={formatPrice(total, store)}
          paymentMethods={store.paymentMethods}
          disabled={unavailable.length > 0}
        />
      </div>

      <section
        aria-labelledby="summary-heading"
        className="flex flex-col gap-6 rounded-md border p-6 lg:sticky lg:top-24 lg:self-start"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="summary-heading" className="font-sans text-base font-medium tracking-normal">
            Order summary
          </h2>
          <Link href="/cart" className="text-sm underline underline-offset-4">
            Edit bag
          </Link>
        </div>
        <ul className="flex flex-col gap-4">
          {cart.lines
            .filter((line) => line.available)
            .map((line) => (
              <li key={line.variantId} className="flex gap-3">
                <div className="relative aspect-3/4 w-14 shrink-0 overflow-hidden rounded-sm bg-muted">
                  {line.image && (
                    <Image
                      src={`/media/${line.image.key}`}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 text-sm">
                  <span>{line.name}</span>
                  <span className="text-muted-foreground">
                    {[...line.options.map((option) => option.value), `Qty ${line.quantity}`].join(
                      ' · ',
                    )}
                  </span>
                </div>
                <span className="text-sm tabular-nums">{formatPrice(line.lineTotal, store)}</span>
              </li>
            ))}
        </ul>
        <dl className="flex flex-col gap-3 border-t pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(cart.subtotal, store)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="tabular-nums">
              {shipping === 0 ? 'Free' : formatPrice(shipping, store)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(total, store)}</dd>
          </div>
        </dl>
        {store.shipping.freeOver !== null && shipping > 0 && (
          <p className="text-xs text-muted-foreground">
            Free shipping on orders from {formatPrice(store.shipping.freeOver, store)}.
          </p>
        )}
      </section>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_24rem] lg:gap-16" aria-busy>
      <div className="flex flex-col gap-5">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-md" />
    </div>
  );
}
