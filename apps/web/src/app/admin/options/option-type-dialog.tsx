'use client';

import { useActionState, useState } from 'react';
import type { OptionType } from '@repo/shared';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formKey, initialActionState, type ActionState } from '@/lib/forms/action-state';
import { saveOptionType } from './actions';

/** Creates an option type, or renames `optionType` when given. */
export function OptionTypeDialog({ optionType }: { optionType?: OptionType }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await saveOptionType(previous, formData);
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
        {optionType ? (
          <Button variant="ghost" size="sm" aria-label={`Rename ${optionType.name}`}>
            Rename
          </Button>
        ) : (
          <Button>New option</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form key={formKey(state)} action={formAction} className="grid gap-5" noValidate>
          {optionType && <input type="hidden" name="id" value={optionType.id} />}
          <DialogHeader>
            <DialogTitle>{optionType ? 'Rename option' : 'New option'}</DialogTitle>
            {!optionType && (
              <DialogDescription>
                Options are how a product varies, such as Size, Colour or Fit.
              </DialogDescription>
            )}
          </DialogHeader>
          <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
          <FormField
            name="name"
            label="Name"
            placeholder="e.g. Size"
            defaultValue={values.name ?? optionType?.name}
            error={errors.name}
          />
          <FormField
            name="slug"
            label="URL slug"
            placeholder="Generated from the name"
            defaultValue={values.slug ?? optionType?.slug}
            error={errors.slug}
          />
          {!optionType && (
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-medium">Values are</legend>
              <RadioGroup name="kind" defaultValue={values.kind ?? 'text'} className="gap-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="kind-text" value="text" />
                  <Label htmlFor="kind-text">Text labels, e.g. S, M, L</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="kind-color" value="color" />
                  <Label htmlFor="kind-color">Colours with a swatch</Label>
                </div>
              </RadioGroup>
            </fieldset>
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
