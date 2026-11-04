import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ContentPage, ContentSection } from '@/components/layout/content-page';
import { Skeleton } from '@/components/ui/skeleton';
import { contentConfig } from '@/config/content';
import { getStoreConfig } from '@/lib/api/store';
import { formatPrice } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Shipping',
  description: 'Delivery times, charges and cash on delivery at Anwar Shah & Sons.',
};

export default function ShippingPage() {
  const { shipping } = contentConfig;

  return (
    <ContentPage title="Shipping" intro={shipping.areas}>
      <ContentSection title="Charges">
        {/* The rates come from the store settings, so this page never disagrees with checkout. */}
        <Suspense fallback={<Skeleton className="h-6 w-2/3" />}>
          <Charges />
        </Suspense>
      </ContentSection>
      <ContentSection title="Delivery time">
        <p>
          Orders usually arrive within {shipping.deliveryTime}. We&apos;ll email you when your order
          ships.
        </p>
      </ContentSection>
      <ContentSection title="Paying on delivery">
        <p>
          Pay in cash when your order arrives. Please have the exact amount ready; you&apos;ll find
          it in your order confirmation email and under Your orders.
        </p>
      </ContentSection>
    </ContentPage>
  );
}

async function Charges() {
  const store = await getStoreConfig();
  const { flatRate, freeOver } = store.shipping;

  if (flatRate === 0) return <p>Shipping is free on every order.</p>;
  return (
    <p>
      Shipping is {formatPrice(flatRate, store)} per order
      {freeOver !== null && <>, and free on orders of {formatPrice(freeOver, store)} or more</>}.
    </p>
  );
}
