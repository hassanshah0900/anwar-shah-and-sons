import type { Metadata } from 'next';
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
    <html lang="en" className={cn(fontVariables, 'h-full antialiased')}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
