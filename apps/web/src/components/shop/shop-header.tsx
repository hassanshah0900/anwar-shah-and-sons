import Link from 'next/link';
import type { ReactNode } from 'react';
import { Fragment } from 'react';

export type Crumb = { name: string; href: string };

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
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb) => (
              <Fragment key={crumb.href}>
                <li>
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.name}
                  </Link>
                </li>
                <li aria-hidden>/</li>
              </Fragment>
            ))}
            <li aria-current="page" className="text-foreground">
              {title}
            </li>
          </ol>
        </nav>
      )}

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
