'use client';

import { useTransition } from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_LINE_QUANTITY } from '@repo/shared';
import {
  removeFromCart,
  updateCartQuantity,
  type CartActionResult,
} from '@/app/(store)/cart/actions';
import { Button } from '@/components/ui/button';

/** Quantity stepper and remove button for one cart line. */
export function CartLineControls({
  variantId,
  name,
  quantity,
}: {
  variantId: string;
  name: string;
  quantity: number;
}) {
  const [pending, startTransition] = useTransition();

  const change = (action: () => Promise<CartActionResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.message);
    });

  return (
    <div className="flex items-center gap-4">
      <div
        role="group"
        aria-label={`Quantity of ${name}`}
        className="flex h-9 items-center rounded-sm border"
        aria-busy={pending}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Decrease quantity"
          disabled={pending || quantity <= 1}
          onClick={() => change(() => updateCartQuantity(variantId, quantity - 1))}
        >
          <MinusIcon />
        </Button>
        <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
          {quantity}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Increase quantity"
          disabled={pending || quantity >= MAX_LINE_QUANTITY}
          onClick={() => change(() => updateCartQuantity(variantId, quantity + 1))}
        >
          <PlusIcon />
        </Button>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => change(() => removeFromCart(variantId))}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
      >
        Remove<span className="sr-only"> {name}</span>
      </button>
    </div>
  );
}
