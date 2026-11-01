import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="page-container flex flex-1 flex-col items-start justify-center gap-6 py-24">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Error 404
        </p>
        <h1 className="text-5xl sm:text-6xl">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has moved.
        </p>
        <Button asChild size="lg">
          <Link href="/">Back to home</Link>
        </Button>
      </main>
      <SiteFooter />
    </>
  );
}
