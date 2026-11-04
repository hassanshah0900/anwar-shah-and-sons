import Link from 'next/link';
import { Suspense } from 'react';
import { siteConfig } from '@/config/site';
import { getShopNav, shopAllLink, type NavLink } from '@/lib/catalog/nav';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="page-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-heading text-2xl leading-none">{siteConfig.name}</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{siteConfig.description}</p>
        </div>

        <Suspense fallback={<FooterSection title="Shop" links={[shopAllLink]} />}>
          <ShopSection />
        </Suspense>
        {siteConfig.footerNav.map((section) => (
          <FooterSection key={section.title} title={section.title} links={section.links} />
        ))}
      </div>

      <div className="border-t">
        <p className="page-container py-6 text-xs text-muted-foreground">
          © {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

async function ShopSection() {
  return <FooterSection title="Shop" links={await getShopNav()} />;
}

function FooterSection({ title, links }: { title: string; links: readonly NavLink[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm transition-colors hover:text-muted-foreground"
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
