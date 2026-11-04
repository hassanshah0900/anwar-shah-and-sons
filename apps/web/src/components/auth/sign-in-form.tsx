'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { ADMIN_ROLE, signInSchema } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { authClient, authErrorMessage } from '@/lib/auth/client';
import { safeCallbackUrl } from '@/lib/auth/redirect';
import { FormError } from '@/components/forms/form-error';
import { FormField } from '@/components/forms/form-field';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export function SignInForm() {
  const requested = useSearchParams().get('callbackUrl');
  const callbackUrl = safeCallbackUrl(requested);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors({ email: errors.email?.[0], password: errors.password?.[0] });
      return;
    }
    setFieldErrors({});

    setPending(true);
    const { data, error } = await authClient.signIn.email(parsed.data);
    if (error) {
      setFormError(authErrorMessage(error));
      setPending(false);
      return;
    }

    // Admins land in the admin area unless they were sent here from a specific page.
    const isAdmin = (data.user as { role?: string }).role === ADMIN_ROLE;
    // A full page load: the browser's route cache may still hold "redirect to
    // sign-in" for protected pages visited while signed out.
    window.location.replace(!requested && isAdmin ? '/admin' : callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <FormError message={formError} />
      <FormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email}
      />
      <div className="grid gap-2">
        <FormField
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
        />
        <Link
          href="/forgot-password"
          className="justify-self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-sm text-muted-foreground">
        New here?{' '}
        <Link
          href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
