'use client';

import { useActionState, useState } from 'react';
import type { OptionType, OptionValue } from '@repo/shared';
import { ColorField } from '@/components/admin/color-field';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { initialActionState, type ActionState } from '@/lib/forms/action-state';
import { saveOptionValue } from './actions';

/** Inline form that adds a value to an option type. */
export function AddOptionValueForm({ optionType }: { optionType: OptionType }) {
  const [state, formAction, pending] = useActionState(saveOptionValue, initialActionState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const prefix = `add-${optionType.id}`;

  return (
    <form action={formAction} className="grid gap-3" noValidate>
      <input type="hidden" name="typeId" value={optionType.id} />
      <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-48 flex-1">
          <FormField
            id={`${prefix}-label`}
            name="label"
            label={`New ${optionType.name.toLowerCase()} value`}
            placeholder={optionType.kind === 'color' ? 'e.g. Black' : 'e.g. M'}
            defaultValue={values.label}
            error={errors.label}
          />
        </div>
        {optionType.kind === 'color' && (
          <ColorField
            id={`${prefix}-color`}
            name="colorHex"
            label="Swatch"
            defaultValue={values.colorHex}
            error={errors.colorHex}
          />
        )}
        <Button type="submit" variant="outline" disabled={pending} className="mt-7">
          {pending ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </form>
  );
}

/** Dialog that edits one value of an option type. */
export function EditOptionValueDialog({
  optionType,
  value,
}: {
  optionType: OptionType;
  value: OptionValue;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveOptionValue(previous, formData);
      if (result.status === 'success') setOpen(false);
      return result;
    },
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Edit ${value.label}`}>
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="grid gap-5" noValidate>
          <input type="hidden" name="typeId" value={optionType.id} />
          <input type="hidden" name="valueId" value={value.id} />
          <DialogHeader>
            <DialogTitle>Edit {value.label}</DialogTitle>
          </DialogHeader>
          <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
          <FormField
            name="label"
            label="Label"
            defaultValue={values.label ?? value.label}
            error={errors.label}
          />
          <FormField
            name="slug"
            label="URL slug"
            defaultValue={values.slug ?? value.slug}
            error={errors.slug}
          />
          {optionType.kind === 'color' && (
            <ColorField
              name="colorHex"
              label="Swatch"
              defaultValue={values.colorHex ?? value.colorHex}
              error={errors.colorHex}
            />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
