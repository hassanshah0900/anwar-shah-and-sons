'use client';

import Link from 'next/link';
import { useState } from 'react';
import { z } from 'zod';
import { forgotPasswordSchema } from '@repo/shared';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth/client';

/**
 * Asks for a reset link. The confirmation is the same whether or not the
 * address has an account, so the form can't be used to discover accounts.
 */
export function ForgotPasswordForm() {
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      setEmailError(z.flattenError(parsed.error).fieldErrors.email?.[0]);
      return;
    }
    setEmailError(undefined);

    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: '/reset-password',
    });
    setPending(false);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div role="status" className="grid gap-4">
        <p>
          If <span className="font-medium">{sentTo}</span> has an account, we&apos;ve sent it a link
          to reset the password. The link works for an hour.
        </p>
        <p className="text-sm text-muted-foreground">
          No email? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="text-foreground underline underline-offset-4"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <FormError message={formError} />
      <FormField name="email" label="Email" type="email" autoComplete="email" error={emailError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
      <p className="text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/sign-in" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
