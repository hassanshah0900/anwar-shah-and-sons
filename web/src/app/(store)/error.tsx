'use client';

import { ErrorView } from '@/components/layout/error-view';

/** Errors in a store page; the header and footer around it keep working. */
export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView reset={reset} digest={error.digest} />;
}
