import Link from 'next/link';
import { getShopNav, type NavLink } from '@/lib/catalog/nav';
import { MobileNav } from './mobile-nav';

/** Desktop links for the header. */
export function MainNavLinks({ links }: { links: NavLink[] }) {
  return (
    <ul className="flex items-center gap-6">
      {links.map((item) => (
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
  );
}

export async function MainNav() {
  return <MainNavLinks links={await getShopNav()} />;
}

export async function MobileNavWithCategories() {
  return <MobileNav links={await getShopNav()} />;
}
