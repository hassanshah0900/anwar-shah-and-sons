import { Suspense } from 'react';
import { ApiStatus, ApiStatusSkeleton } from '@/components/api-status';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Anwar Shah &amp; Sons
      </h1>
      <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Our online store is under construction. Check back soon.
      </p>

      {/* Static shell renders immediately; the live status streams in per request. */}
      <Suspense fallback={<ApiStatusSkeleton />}>
        <ApiStatus />
      </Suspense>
    </main>
  );
}
