'use client';

import { useActionState, useState } from 'react';
import { orderStatusTransitions, type OrderStatus } from '@repo/shared';
import { FormError } from '@/components/forms/form-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { initialActionState } from '@/lib/forms/action-state';
import { updateOrderStatusAction } from '../actions';

const actionLabels: Record<OrderStatus, string> = {
  pending: 'Mark pending',
  confirmed: 'Confirm order',
  shipped: 'Mark shipped',
  delivered: 'Mark delivered',
  cancelled: 'Cancel order',
};

/** The next steps allowed for an order; cancelling asks for confirmation first. */
export function OrderStatusActions({ number, status }: { number: number; status: OrderStatus }) {
  const [state, formAction, pending] = useActionState(updateOrderStatusAction, initialActionState);
  const next = orderStatusTransitions[status];
  if (next.length === 0) return null;

  const forward = next.filter((target) => target !== 'cancelled');

  return (
    <div className="flex flex-col gap-3">
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
      <div className="flex flex-wrap gap-3">
        {forward.map((target) => (
          <form key={target} action={formAction}>
            <input type="hidden" name="number" value={number} />
            <input type="hidden" name="status" value={target} />
            <Button type="submit" disabled={pending}>
              {actionLabels[target]}
            </Button>
          </form>
        ))}
        {next.includes('cancelled') && (
          <CancelOrderDialog number={number} formAction={formAction} pending={pending} />
        )}
      </div>
    </div>
  );
}

function CancelOrderDialog({
  number,
  formAction,
  pending,
}: {
  number: number;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          Cancel order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          action={(formData) => {
            formAction(formData);
            setOpen(false);
          }}
          className="grid gap-5"
        >
          <input type="hidden" name="number" value={number} />
          <input type="hidden" name="status" value="cancelled" />
          <DialogHeader>
            <DialogTitle>Cancel order #{number}?</DialogTitle>
            <DialogDescription>
              The customer&apos;s items go back into stock. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep order
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive">
              Cancel order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
