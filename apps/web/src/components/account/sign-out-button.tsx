'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';

export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }

  return { signOut, pending };
}

export function SignOutButton() {
  const { signOut, pending } = useSignOut();

  return (
    <Button variant="outline" onClick={signOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
