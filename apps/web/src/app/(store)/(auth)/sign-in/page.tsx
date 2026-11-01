import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-5xl">Sign in</h1>
      <p className="mt-3 mb-8 text-muted-foreground">Welcome back.</p>
      {/* The form reads ?callbackUrl, a request-time value. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </>
  );
}
