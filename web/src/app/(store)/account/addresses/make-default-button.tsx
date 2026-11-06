'use client';

import { useActionState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { initialActionState, type ActionState } from '@/lib/forms/action-state';

export function MakeDefaultButton({
  id,
  action,
}: {
  id: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await action(previous, formData);
      if (result.status === 'error') toast.error(result.message ?? 'Could not update the address.');
      return result;
    },
    initialActionState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Make default
      </Button>
    </form>
  );
}
