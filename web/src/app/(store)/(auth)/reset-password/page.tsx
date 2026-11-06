import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false },
  // The URL carries a reset token; don't leak it to other sites.
  referrer: 'no-referrer',
};

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-5xl">Choose a new password</h1>
      <p className="mt-3 mb-8 text-muted-foreground">Use at least 8 characters.</p>
      {/* The form reads ?token, a request-time value. */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
