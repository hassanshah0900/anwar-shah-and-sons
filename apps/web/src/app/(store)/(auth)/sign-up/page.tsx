import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-5xl">Create an account</h1>
      <p className="mt-3 mb-8 text-muted-foreground">Track orders and check out faster.</p>
      {/* The form reads ?callbackUrl, a request-time value. */}
      <Suspense>
        <SignUpForm />
      </Suspense>
    </>
  );
}
