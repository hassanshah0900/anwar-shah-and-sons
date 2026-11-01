import Link from 'next/link';
import { LayoutDashboardIcon, UserIcon } from 'lucide-react';
import { ADMIN_ROLE } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { getSessionUser } from '@/lib/auth/session';
import { AccountMenuDropdown } from './account-menu-dropdown';

/** Header account controls. Reads the session, so render it inside <Suspense>. */
export async function AccountMenu() {
  const user = await getSessionUser();
  if (!user) return <SignInLink />;

  return (
    <>
      {user.role === ADMIN_ROLE && <AdminLink />}
      <AccountMenuDropdown user={user} />
    </>
  );
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

/** Visible entry to the admin area, for admins only. */
function AdminLink() {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href="/admin">
        <LayoutDashboardIcon data-icon="inline-start" />
        Admin
      </Link>
    </Button>
  );
}
