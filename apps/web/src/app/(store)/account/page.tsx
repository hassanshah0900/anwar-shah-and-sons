import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { SignOutButton } from '@/components/account/sign-out-button';
import { ADMIN_ROLE } from '@repo/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <main className="page-container py-16">
      <h1 className="text-5xl">Your account</h1>
      <Suspense fallback={<AccountDetailsSkeleton />}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function AccountDetails() {
  const user = await requireUser('/account');

  return (
    <section aria-labelledby="profile-heading" className="mt-10 max-w-xl">
      <h2 id="profile-heading" className="text-2xl">
        Profile
      </h2>
      <dl className="mt-4 divide-y border-y">
        <Row label="Name">{user.name}</Row>
        <Row label="Email">{user.email}</Row>
        <Row label="Account type">
          <Badge variant="outline" className="capitalize">
            {user.role}
          </Badge>
        </Row>
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        {user.role === ADMIN_ROLE && (
          <Button asChild>
            <Link href="/admin">Go to admin</Link>
          </Button>
        )}
        <SignOutButton />
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{children}</dd>
    </div>
  );
}

function AccountDetailsSkeleton() {
  return (
    <div className="mt-10 max-w-xl space-y-4">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
