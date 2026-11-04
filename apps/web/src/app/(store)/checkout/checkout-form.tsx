'use client';

import { useActionState, useState } from 'react';
import type { Address } from '@repo/shared';
import { AddressFields } from '@/components/account/address-fields';
import { FormError } from '@/components/forms/form-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formKey, initialActionState } from '@/lib/forms/action-state';
import { placeOrderAction } from './actions';

const NEW_ADDRESS = 'new';

const describe = (address: Address) =>
  [address.fullName, address.line1, address.city].filter(Boolean).join(', ');

/**
 * Shipping address and payment. Saved addresses can fill the fields (the
 * default is chosen to start with). The total shown is sent back so the API
 * can refuse a changed one.
 */
export function CheckoutForm({
  defaultName,
  savedAddresses,
  expectedTotal,
  totalLabel,
  disabled,
}: {
  defaultName: string;
  savedAddresses: Address[];
  expectedTotal: number;
  /** The formatted total, for the button. */
  totalLabel: string;
  /** Set when the bag has items that can't be bought. */
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initialActionState);
  const [choice, setChoice] = useState(savedAddresses[0]?.id ?? NEW_ADDRESS);
  const chosen = savedAddresses.find((address) => address.id === choice);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  // After a failed submit, show what was typed; otherwise the chosen saved address.
  const defaults = state.values
    ? Object.fromEntries(
        Object.entries(values)
          .filter(([key]) => key.startsWith('address.'))
          .map(([key, value]) => [key.slice('address.'.length), value]),
      )
    : (chosen ?? { fullName: defaultName });

  return (
    <form action={formAction} className="flex flex-col gap-10" noValidate>
      <input type="hidden" name="expectedTotal" value={expectedTotal} />
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />

      <fieldset className="grid gap-5">
        <legend className="mb-5 text-lg font-medium">Shipping address</legend>

        {savedAddresses.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="saved-address">Ship to</Label>
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger id="saved-address" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {savedAddresses.map((address) => (
                  <SelectItem key={address.id} value={address.id}>
                    {describe(address)}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_ADDRESS}>A new address</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Re-mounted when the choice changes, so the fields take the new defaults. */}
        <AddressFields
          key={`${choice}-${formKey(state)}`}
          prefix="address."
          idPrefix="checkout"
          defaults={defaults}
          errors={errors}
        />

        {!chosen && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="save-address"
              name="saveAddress"
              defaultChecked={state.values ? values.saveAddress === 'on' : true}
            />
            <Label htmlFor="save-address">Save this address to my account</Label>
          </div>
        )}

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
