import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { fontVariables } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Anwar Shah & Sons',
    template: '%s | Anwar Shah & Sons',
  },
  description: 'Shop online at Anwar Shah & Sons.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes sets the theme class before hydration, so React must not warn about it.
    <html lang="en" className={cn(fontVariables, 'h-full antialiased')} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
