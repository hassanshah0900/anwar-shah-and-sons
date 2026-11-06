import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { siteConfig } from '@/config/site';
import { fontVariables } from '@/lib/fonts';
import { siteUrl } from '@/lib/site-url';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: { type: 'website', siteName: siteConfig.name },
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
