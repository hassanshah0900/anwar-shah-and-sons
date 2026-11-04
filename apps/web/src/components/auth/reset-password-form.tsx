'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { resetPasswordSchema } from '@repo/shared';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth/client';

type FieldErrors = Partial<Record<'password' | 'confirmPassword', string>>;

/**
 * Sets a new password with the token from the emailed link. Better Auth sends
 * an expired or used link here with ?error=INVALID_TOKEN instead of a token.
 */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || params.get('error')) {
    return (
      <div className="grid gap-4">
        <p>This reset link has expired or was already used.</p>
        <Button asChild size="lg">
          <Link href="/forgot-password">Get a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status" className="grid gap-4">
        <p>Your password has been changed. You&apos;ve been signed out everywhere else.</p>
        <Button asChild size="lg">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = resetPasswordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors({
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      return;
    }
    setFieldErrors({});

    setPending(true);
    const { error } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token: token!,
    });
    setPending(false);
    if (error) {
      setFormError(
        error.code === 'INVALID_TOKEN'
          ? 'This reset link has expired or was already used. Request a new one.'
          : authErrorMessage(error),
      );
      return;
    }
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <FormError message={formError} />
      <FormField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.password}
      />
      <FormField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}
