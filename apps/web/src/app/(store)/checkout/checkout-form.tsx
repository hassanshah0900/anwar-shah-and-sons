'use client';

import { useActionState } from 'react';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { initialActionState } from '@/lib/forms/action-state';
import { placeOrderAction } from './actions';

/** Shipping address and payment. The total shown is sent back so the API can refuse a changed one. */
export function CheckoutForm({
  defaultName,
  expectedTotal,
  totalLabel,
  disabled,
}: {
  defaultName: string;
  expectedTotal: number;
  /** The formatted total, for the button. */
  totalLabel: string;
  /** Set when the bag has items that can't be bought. */
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initialActionState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const field = (name: string) => ({
    name,
    id: name.replace('.', '-'),
    defaultValue: values[name],
    error: errors[name],
  });

  return (
    <form action={formAction} className="flex flex-col gap-10" noValidate>
      <input type="hidden" name="expectedTotal" value={expectedTotal} />
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />

      <fieldset className="grid gap-5">
        <legend className="mb-5 text-lg font-medium">Shipping address</legend>
        <FormField
          label="Full name"
          autoComplete="name"
          {...field('address.fullName')}
          defaultValue={values['address.fullName'] ?? defaultName}
        />
        <FormField label="Phone" type="tel" autoComplete="tel" {...field('address.phone')} />
        <FormField label="Address" autoComplete="address-line1" {...field('address.line1')} />
        <FormField
          label="Apartment, suite, etc. (optional)"
          autoComplete="address-line2"
          {...field('address.line2')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="City" autoComplete="address-level2" {...field('address.city')} />
          <FormField
            label="Postal code (optional)"
            autoComplete="postal-code"
            {...field('address.postalCode')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Delivery notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={values.notes} />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-3 text-lg font-medium">Payment</legend>
        <input type="hidden" name="paymentMethod" value="cod" />
        <div className="rounded-md border border-foreground p-4">
          <p className="text-sm font-medium">Cash on delivery</p>
          <p className="mt-1 text-sm text-muted-foreground">Pay in cash when your order arrives.</p>
        </div>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending || disabled}>
        {pending ? 'Placing order…' : `Place order · ${totalLabel}`}
      </Button>
    </form>
  );
}
