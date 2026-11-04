'use client';

import { ErrorView } from '@/components/layout/error-view';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView reset={reset} digest={error.digest} homeHref="/admin" />;
}
