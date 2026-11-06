'use client';

import { useActionState } from 'react';
import { FormError } from '@/components/forms/form-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { initialActionState } from '@/lib/forms/action-state';
import { retryRefundAction } from '../actions';

/** Shown when the refund failed as the order was cancelled: the customer is still out of pocket. */
export function RetryRefund({ number }: { number: number }) {
  const [state, formAction, pending] = useActionState(retryRefundAction, initialActionState);

  return (
    <Alert variant="destructive" className="gap-3 border-destructive p-4">
      <AlertDescription>
        This order was cancelled but its refund failed, so the customer hasn&apos;t got their money
        back.
      </AlertDescription>
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
      <form action={formAction}>
        <input type="hidden" name="number" value={number} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? 'Refunding…' : 'Retry refund'}
        </Button>
      </form>
    </Alert>
  );
}
