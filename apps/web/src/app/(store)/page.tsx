import { Suspense } from 'react';
import { ApiStatus, ApiStatusSkeleton } from '@/components/api-status';

export default function HomePage() {
  return (
    <main className="page-container flex flex-1 flex-col justify-center gap-6 py-24">
      <h1 className="text-5xl text-foreground sm:text-6xl">Anwar Shah &amp; Sons</h1>
      <p className="max-w-xl text-lg leading-8 text-muted-foreground">
        Our online store is under construction. Check back soon.
      </p>

      {/* Static shell renders immediately; the live status streams in per request. */}
      <Suspense fallback={<ApiStatusSkeleton />}>
        <ApiStatus />
      </Suspense>
    </main>
  );
}
