import Image from 'next/image';
import Link from 'next/link';
import type { Order, StoreConfig } from '@repo/shared';
import { formatPrice } from '@/lib/money';

const paymentLabels = {
  cod: 'Cash on delivery',
  card: 'Card',
} satisfies Record<Order['paymentMethod'], string>;

const paymentStatusLabels = {
  unpaid: 'Not paid',
  paid: 'Paid',
  refunded: 'Refunded',
} satisfies Record<Order['paymentStatus'], string>;

export function formatOrderDate(iso: string, store: StoreConfig): string {
  return new Intl.DateTimeFormat(store.locale, { dateStyle: 'medium' }).format(new Date(iso));
}

/** An order's lines, totals, address and payment, as shown to customers and admins. */
export function OrderDetails({
  order,
  store,
  showSku = false,
}: {
  order: Order;
  store: StoreConfig;
  /** For staff picking the order. */
  showSku?: boolean;
}) {
  // Amounts are in the order's currency, which may differ from today's store currency.
  const money = { currency: order.currency, locale: store.locale };
  const { address } = order;

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
      <section aria-labelledby="items-heading" className="flex flex-col gap-6">
        <h2 id="items-heading" className="font-sans text-base font-medium tracking-normal">
          Items
        </h2>
        <ul className="divide-y border-y">
          {order.items.map((item, index) => (
            <li key={`${item.sku}-${index}`} className="flex gap-4 py-5">
              <div className="relative aspect-3/4 w-16 shrink-0 overflow-hidden rounded-sm bg-muted">
                {item.imageKey && (
                  <Image
                    src={`/media/${item.imageKey}`}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 text-sm">
                {item.productSlug ? (
                  <Link href={`/products/${item.productSlug}`} className="hover:underline">
                    {item.productName}
                  </Link>
                ) : (
                  <span>{item.productName}</span>
                )}
                {item.variantLabel && (
                  <span className="text-muted-foreground">{item.variantLabel}</span>
                )}
                {showSku && (
                  <span className="font-mono text-xs text-muted-foreground">SKU {item.sku}</span>
                )}
                <span className="text-muted-foreground tabular-nums">
                  {item.quantity} × {formatPrice(item.unitPrice, money)}
                </span>
              </div>
              <span className="text-sm tabular-nums">{formatPrice(item.lineTotal, money)}</span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto flex w-full max-w-xs flex-col gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal, money)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="tabular-nums">
              {order.shipping === 0 ? 'Free' : formatPrice(order.shipping, money)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t pt-3 text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPrice(order.total, money)}</dd>
          </div>
        </dl>
      </section>

      <aside className="flex flex-col gap-8 text-sm">
        <section aria-labelledby="address-heading" className="flex flex-col gap-2">
          <h2 id="address-heading" className="font-sans text-base font-medium tracking-normal">
            Shipping address
          </h2>
          <address className="flex flex-col gap-0.5 text-muted-foreground not-italic">
            <span className="text-foreground">{address.fullName}</span>
            <span>{address.line1}</span>
            {address.line2 && <span>{address.line2}</span>}
            <span>{[address.city, address.postalCode].filter(Boolean).join(' ')}</span>
            <span>{address.phone}</span>
          </address>
        </section>
        <section aria-labelledby="payment-heading" className="flex flex-col gap-2">
          <h2 id="payment-heading" className="font-sans text-base font-medium tracking-normal">
            Payment
          </h2>
          <p className="text-muted-foreground">
            {paymentLabels[order.paymentMethod]} · {paymentStatusLabels[order.paymentStatus]}
          </p>
        </section>
        {order.notes && (
          <section aria-labelledby="notes-heading" className="flex flex-col gap-2">
            <h2 id="notes-heading" className="font-sans text-base font-medium tracking-normal">
              Delivery notes
            </h2>
            <p className="whitespace-pre-line text-muted-foreground">{order.notes}</p>
          </section>
        )}
      </aside>
    </div>
  );
}
