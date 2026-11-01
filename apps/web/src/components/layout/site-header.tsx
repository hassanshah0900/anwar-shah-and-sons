import Link from 'next/link';
import { ShoppingBagIcon, UserIcon } from 'lucide-react';
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
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account" aria-label="Account">
              <UserIcon />
            </Link>
          </Button>
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
