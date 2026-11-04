'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** What visitors see when a page fails to render: a way to retry and a way out. */
export function ErrorView({
  reset,
  digest,
  homeHref = '/',
}: {
  reset: () => void;
  /** Next.js's error id, matching the server log entry, for support requests. */
  digest?: string;
  homeHref?: string;
}) {
  return (
    <main className="page-container flex flex-1 flex-col items-start justify-center gap-6 py-24">
      <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Error</p>
      <h1 className="text-5xl sm:text-6xl">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        We couldn&apos;t load this page. Please try again in a moment.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href={homeHref}>Go home</Link>
        </Button>
      </div>
      {digest && <p className="text-xs text-muted-foreground">Reference: {digest}</p>}
    </main>
  );
}
