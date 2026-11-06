'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { profileSchema } from '@repo/shared';
import { toast } from 'sonner';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth/client';

/** Changes the account's display name (also the default name at checkout). */
export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = profileSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.name?.[0]);
      return;
    }
    setError(undefined);

    setPending(true);
    const result = await authClient.updateUser({ name: parsed.data.name });
    setPending(false);
    if (result.error) {
      setFormError(authErrorMessage(result.error));
      return;
    }
    toast.success('Name updated');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <FormField name="name" label="Name" autoComplete="name" defaultValue={name} error={error} />
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? 'Saving…' : 'Save name'}
        </Button>
      </div>
    </form>
  );
}
