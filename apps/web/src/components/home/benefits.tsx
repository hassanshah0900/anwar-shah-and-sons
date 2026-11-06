import {
  CreditCardIcon,
  RefreshCwIcon,
  TruckIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import { contentConfig } from '@/config/content';
import { getStoreConfig } from '@/lib/api/store';
import { formatPrice } from '@/lib/money';

type Benefit = { icon: LucideIcon; title: string; text: string };

/** What every order comes with, from the store's own settings and policies. */
export async function Benefits() {
  const store = await getStoreConfig();
  const { shipping, returns } = contentConfig;

  const benefits: Benefit[] = [
    {
      icon: TruckIcon,
      title: store.shipping.freeOver
        ? `Free delivery over ${formatPrice(store.shipping.freeOver, store)}`
        : 'Delivery across Pakistan',
      text: `Arrives in ${shipping.deliveryTime}.`,
    },
    ...(store.paymentMethods.includes('cod')
      ? [{ icon: WalletIcon, title: 'Cash on delivery', text: 'Pay when your order arrives.' }]
      : []),
    {
      icon: RefreshCwIcon,
      title: 'Easy exchanges',
      text: `Within ${returns.windowDays} days of delivery.`,
    },
    ...(store.paymentMethods.includes('card')
      ? [{ icon: CreditCardIcon, title: 'Secure card payments', text: 'Handled by Stripe.' }]
      : []),
  ];

  return (
    <section aria-label="Why shop with us" className="border-y">
      <ul className="page-container grid grid-cols-2 gap-x-6 gap-y-8 py-8 lg:grid-cols-4">
        {benefits.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
