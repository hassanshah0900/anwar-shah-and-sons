import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageBreadcrumbs, type Crumb } from '@/components/layout/page-breadcrumbs';

export type { Crumb };

/** Breadcrumbs, title and an optional row of links (sub-categories) above a listing. */
export function ShopHeader({
  title,
  description,
  breadcrumbs = [],
  links = [],
  children,
}: {
  title: string;
  description?: string | null;
  breadcrumbs?: Crumb[];
  links?: Crumb[];
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 pb-10">
      {breadcrumbs.length > 0 && <PageBreadcrumbs crumbs={breadcrumbs} current={title} />}

      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      {children}

      {links.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex h-9 items-center rounded-sm border px-4 text-sm transition-colors hover:border-foreground"
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
