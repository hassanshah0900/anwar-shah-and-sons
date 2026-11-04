import Link from 'next/link';
import { ShoppingBagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCartOrEmpty } from '@/lib/api/cart';

/** The header's bag link, with the number of items when there are any. */
export function CartLink({ count = 0 }: { count?: number }) {
  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link
        href="/cart"
        aria-label={
          count ? `Shopping bag, ${count} ${count === 1 ? 'item' : 'items'}` : 'Shopping bag'
        }
      >
        <ShoppingBagIcon />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-medium text-primary-foreground tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
}

/** Reads the cart per request: render inside <Suspense> with <CartLink /> as the fallback. */
export async function CartButton() {
  const cart = await getCartOrEmpty();
  return <CartLink count={cart.itemCount} />;
}
