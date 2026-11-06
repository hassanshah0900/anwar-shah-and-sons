import Link from 'next/link';
import { Suspense } from 'react';
import { AccountMenu, SignInLink } from '@/components/account/account-menu';
import { CartButton, CartLink } from '@/components/cart/cart-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { siteConfig } from '@/config/site';
import { shopAllLink } from '@/lib/catalog/nav';
import { HeaderSearch } from './header-search';
import { MainNav, MainNavLinks, MobileNavWithCategories } from './main-nav';
import { MobileNav } from './mobile-nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="page-container flex h-16 items-center gap-2 sm:gap-4">
        {/* Category links stream in; until then the menus offer "Shop all". */}
        <Suspense fallback={<MobileNav links={[shopAllLink]} />}>
          <MobileNavWithCategories />
        </Suspense>

        <Link
          href="/"
          className="font-heading text-xl leading-none tracking-tight whitespace-nowrap sm:text-2xl"
        >
          {siteConfig.name}
        </Link>

        <nav aria-label="Main" className="ml-8 hidden md:block">
          <Suspense fallback={<MainNavLinks links={[shopAllLink]} />}>
            <MainNav />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center sm:gap-1">
          <HeaderSearch />
          {/* On phones the theme choice lives in the menu, leaving room for the logo. */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {/* The header is static; only the account control waits for the session. */}
          <Suspense fallback={<SignInLink />}>
            <AccountMenu />
          </Suspense>
          <Suspense fallback={<CartLink />}>
            <CartButton />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
