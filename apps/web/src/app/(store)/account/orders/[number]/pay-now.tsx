'use client';

import { useActionState } from 'react';
import { FormError } from '@/components/forms/form-error';
import { Button } from '@/components/ui/button';
import { initialActionState } from '@/lib/forms/action-state';
import { payNowAction } from './actions';

/** For a card order that hasn't been paid: back to Stripe's page. */
export function PayNow({ number }: { number: number }) {
  const [state, formAction, pending] = useActionState(payNowAction, initialActionState);

  return (
    <section
      aria-labelledby="pay-now-heading"
      className="flex flex-col gap-4 rounded-md border border-foreground p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="pay-now-heading" className="font-sans text-base font-medium tracking-normal">
          This order hasn&apos;t been paid yet
        </h2>
        <p className="text-sm text-muted-foreground">
          Your items are held for a limited time. If you don&apos;t pay, the order is cancelled and
          you won&apos;t be charged.
        </p>
      </div>
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
      <form action={formAction}>
        <input type="hidden" name="number" value={number} />
        <Button type="submit" disabled={pending}>
          {pending ? 'Opening payment…' : 'Pay now'}
        </Button>
      </form>
    </section>
  );
}
