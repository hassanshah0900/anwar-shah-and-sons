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
import { initialActionState, type ActionState } from '@/lib/forms/action-state';

type ConfirmDeleteDialogProps = {
  title: string;
  description: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Hidden inputs identifying what to delete. */
  fields: Record<string, string>;
  /** Accessible name for the default trigger, e.g. "Delete Kurtas". */
  label: string;
  trigger?: React.ReactNode;
};

export function ConfirmDeleteDialog({
  title,
  description,
  action,
  fields,
  label,
  trigger,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === 'success') setOpen(false);
      return result;
    },
    initialActionState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" aria-label={label}>
            Delete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="grid gap-4">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FormError message={state.status === 'error' ? (state.message ?? null) : null} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
