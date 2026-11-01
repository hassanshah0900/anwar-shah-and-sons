import Link from 'next/link';
import { Suspense } from 'react';
import { ShoppingBagIcon } from 'lucide-react';
import { AccountMenu, SignInLink } from '@/components/account/account-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import { MobileNav } from './mobile-nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="page-container flex h-16 items-center gap-4">
        <MobileNav />

        <Link href="/" className="font-heading text-2xl leading-none tracking-tight">
          {siteConfig.name}
        </Link>

        <nav aria-label="Main" className="ml-8 hidden md:block">
          <ul className="flex items-center gap-6">
            {siteConfig.mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {/* The header is static; only the account control waits for the session. */}
          <Suspense fallback={<SignInLink />}>
            <AccountMenu />
          </Suspense>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart" aria-label="Shopping bag">
              <ShoppingBagIcon />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
