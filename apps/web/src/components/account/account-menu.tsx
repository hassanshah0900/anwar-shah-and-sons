import Link from 'next/link';
import { UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSessionUser } from '@/lib/auth/session';
import { AccountMenuDropdown } from './account-menu-dropdown';

/** Header account control. Reads the session, so render it inside <Suspense>. */
export async function AccountMenu() {
  const user = await getSessionUser();
  return user ? <AccountMenuDropdown user={user} /> : <SignInLink />;
}

export function SignInLink() {
  return (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/sign-in" aria-label="Sign in">
        <UserIcon />
      </Link>
    </Button>
  );
}
