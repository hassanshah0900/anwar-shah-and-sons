'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import type { ProductDetail } from '@repo/shared';
import { addToCart } from '@/app/(store)/cart/actions';
import { Button } from '@/components/ui/button';

type Variant = ProductDetail['variants'][number];

/** Adds the chosen variant to the bag. Its label says what's still needed. */
export function AddToBag({
  variant,
  missing,
}: {
  variant: Variant | null;
  /** Names of options not chosen yet, e.g. ["Size"]. */
  missing: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const soldOut = variant?.stockLevel === 'out_of_stock';

  const label = pending
    ? 'Adding…'
    : !variant
      ? `Select ${missing.map((name) => name.toLowerCase()).join(' and ')}`
      : soldOut
        ? 'Out of stock'
        : 'Add to bag';

  return (
    <Button
      size="lg"
      className="w-full"
      disabled={!variant || soldOut || pending}
      onClick={() =>
        startTransition(async () => {
          if (!variant) return;
          const result = await addToCart(variant.id, 1);
          if (result.ok) {
            toast.success('Added to your bag', {
              action: { label: 'View bag', onClick: () => router.push('/cart') },
            });
          } else {
            toast.error(result.message);
          }
        })
      }
    >
      {label}
    </Button>
  );
}
