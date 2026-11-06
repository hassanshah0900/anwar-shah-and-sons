'use client';

import { fontVariables } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { ErrorView } from '@/components/layout/error-view';
import './globals.css';

/** Last resort when the root layout itself fails; it replaces the whole document. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={cn(fontVariables, 'h-full antialiased')}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ErrorView reset={reset} digest={error.digest} />
      </body>
    </html>
  );
}
