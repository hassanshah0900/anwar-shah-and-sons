import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import type { CartLine, StoreConfig } from '@repo/shared';
import { CartLineControls } from '@/components/cart/cart-line-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getCart } from '@/lib/api/cart';
import { getStoreConfig } from '@/lib/api/store';
import { formatPrice } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Your bag',
  robots: { index: false },
};

export default function CartPage() {
  return (
    <main className="page-container py-10">
      <h1 className="pb-10 text-4xl sm:text-5xl">Your bag</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </main>
  );
}

async function CartContents() {
  const [cart, store] = await Promise.all([getCart(), getStoreConfig()]);

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-6 border-t pt-10">
        <p className="text-muted-foreground">Your bag is empty.</p>
        <Button asChild>
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  const hasUnavailable = cart.lines.some((line) => !line.available);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
      <ul className="divide-y border-y" aria-label="Items in your bag">
        {cart.lines.map((line) => (
          <li key={line.variantId} className="py-6">
            <LineItem line={line} store={store} />
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="summary-heading"
        className="flex flex-col gap-5 rounded-md border p-6 lg:sticky lg:top-24 lg:self-start"
      >
        <h2 id="summary-heading" className="font-sans text-base font-medium tracking-normal">
          Order summary
        </h2>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
            </dt>
            <dd className="tabular-nums">{formatPrice(cart.subtotal, store)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>Calculated at checkout</dd>
          </div>
        </dl>
        {hasUnavailable && (
          <p className="text-sm text-destructive">
            Some items aren&apos;t available and aren&apos;t included in the subtotal.
          </p>
        )}
        {/* Checkout arrives with the orders feature. */}
        <Button size="lg" disabled>
          Checkout
        </Button>
        <p className="text-center text-xs text-muted-foreground">Checkout opens soon.</p>
        <Link
          href="/shop"
          className="text-center text-sm underline underline-offset-4 hover:text-muted-foreground"
        >
          Continue shopping
        </Link>
      </section>
    </div>
  );
}

function LineItem({ line, store }: { line: CartLine; store: StoreConfig }) {
  return (
    <article className="flex gap-4 sm:gap-6">
      <Link
        href={`/products/${line.slug}`}
        className="relative aspect-3/4 w-24 shrink-0 overflow-hidden rounded-sm bg-muted sm:w-28"
        tabIndex={-1}
        aria-hidden
      >
        {line.image && (
          <Image
            src={`/media/${line.image.key}`}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">
              <Link href={`/products/${line.slug}`} className="hover:underline">
                {line.name}
              </Link>
            </h3>
            {line.options.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {line.options.map((option) => `${option.name}: ${option.value}`).join(' · ')}
              </p>
            )}
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatPrice(line.unitPrice, store)} each
            </p>
          </div>
          <p className="text-sm tabular-nums">{formatPrice(line.lineTotal, store)}</p>
        </div>

        {!line.available && (
          <p className="text-sm text-destructive">
            {line.stockLevel === 'out_of_stock'
              ? 'Out of stock. Remove it to continue.'
              : 'Not available in this quantity. Lower it or remove the item.'}
          </p>
        )}

        <div className="mt-auto">
          <CartLineControls variantId={line.variantId} name={line.name} quantity={line.quantity} />
        </div>
      </div>
    </article>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16" aria-busy>
      <div className="flex flex-col gap-6 border-y py-6">
        {[0, 1].map((index) => (
          <div key={index} className="flex gap-6">
            <Skeleton className="aspect-3/4 w-28 rounded-sm" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  );
}
