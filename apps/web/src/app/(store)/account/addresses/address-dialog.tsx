'use client';

import { useActionState, useState } from 'react';
import type { Address } from '@repo/shared';
import { AddressFields } from '@/components/account/address-fields';
import { FormError } from '@/components/forms/form-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formKey, initialActionState, type ActionState } from '@/lib/forms/action-state';
import { saveAddress } from './actions';

/** Adds an address, or edits `address` when given. */
export function AddressDialog({
  address,
  trigger,
}: {
  address?: Address;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveAddress(previous, formData);
      if (result.status === 'success') setOpen(false);
      return result;
    },
    initialActionState,
  );
  const idPrefix = address ? `address-${address.id}` : 'new-address';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form key={formKey(state)} action={formAction} className="grid gap-5" noValidate>
          {address && <input type="hidden" name="id" value={address.id} />}
          <DialogHeader>
            <DialogTitle>{address ? 'Edit address' : 'Add an address'}</DialogTitle>
          </DialogHeader>
          <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
          <AddressFields
            idPrefix={idPrefix}
            defaults={state.values ?? address}
            errors={state.fieldErrors}
          />
          {!address?.isDefault && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${idPrefix}-default`}
                name="isDefault"
                defaultChecked={state.values?.isDefault === 'on'}
              />
              <Label htmlFor={`${idPrefix}-default`}>Use as my default address</Label>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save address'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
