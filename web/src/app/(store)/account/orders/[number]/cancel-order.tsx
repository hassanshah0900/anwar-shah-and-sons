'use client';

import { useActionState, useState } from 'react';
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
import { cancelOrderAction } from './actions';

/** Lets the customer cancel until the order ships, after asking them to confirm. */
export function CancelOrder({ number, paid }: { number: number; paid: boolean }) {
  const [state, formAction, pending] = useActionState(cancelOrderAction, initialActionState);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-3 border-t pt-6">
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={pending}>
            {pending ? 'Cancelling…' : 'Cancel order'}
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
            <DialogHeader>
              <DialogTitle>Cancel order #{number}?</DialogTitle>
              <DialogDescription>
                {paid
                  ? 'We’ll refund your payment, which should reach you within a few days. '
                  : ''}
                This can&apos;t be undone.
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
    </div>
  );
}
