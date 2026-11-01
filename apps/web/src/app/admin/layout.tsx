import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { siteConfig } from '@/config/site';
import { requireAdmin } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: { default: 'Admin', template: `%s | Admin | ${siteConfig.name}` },
  robots: { index: false, follow: false },
};

/** Admin chrome, separate from the storefront and rendered only for admins. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  // Check before rendering anything admin-specific, so non-admins see only a 404.
  await requireAdmin('/admin');

  return (
    <>
      <header className="border-b">
        <div className="page-container flex h-14 items-center gap-3">
          <Link href="/admin" className="font-heading text-xl leading-none">
            {siteConfig.name}
          </Link>
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Admin
          </span>
          <Link
            href="/"
            className="ml-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to store
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
