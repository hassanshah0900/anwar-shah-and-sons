'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, signUpSchema } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth/client';
import { safeCallbackUrl } from '@/lib/auth/redirect';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';

type FieldErrors = Partial<Record<'name' | 'email' | 'password', string>>;

export function SignUpForm() {
  const callbackUrl = safeCallbackUrl(useSearchParams().get('callbackUrl'));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }
    setFieldErrors({});

    setPending(true);
    const { error } = await authClient.signUp.email(parsed.data);
    if (error) {
      setFormError(authErrorMessage(error));
      setPending(false);
      return;
    }

    // A full page load, so cached signed-out redirects aren't reused (see SignInForm).
    window.location.replace(callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <FormError message={formError} />
      <FormField name="name" label="Full name" autoComplete="name" error={fieldErrors.name} />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        error={fieldErrors.password}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
