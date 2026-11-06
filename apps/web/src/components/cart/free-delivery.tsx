import type { StoreConfig } from '@repo/shared';
import { Progress } from '@/components/ui/progress';
import { freeDeliveryProgress } from '@/lib/cart/free-delivery';
import { formatPrice } from '@/lib/money';

/** "Add Rs X more for free delivery", with a bar; nothing when there's no such offer. */
export function FreeDelivery({ subtotal, store }: { subtotal: number; store: StoreConfig }) {
  const progress = freeDeliveryProgress(subtotal, store.shipping.freeOver);
  if (!progress) return null;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        {progress.remaining === 0 ? (
          'Your order ships free.'
        ) : (
          <>
            Add <span className="font-medium">{formatPrice(progress.remaining, store)}</span> more
            for free delivery.
          </>
        )}
      </p>
      <Progress value={progress.percent} aria-label="Progress towards free delivery" />
    </div>
  );
}
