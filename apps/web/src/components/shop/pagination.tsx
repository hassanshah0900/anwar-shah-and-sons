import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { pageWindow } from '@/lib/catalog/listing-params';
import { cn } from '@/lib/utils';

const itemClass =
  'flex h-9 min-w-9 items-center justify-center gap-1 rounded-sm px-2 text-sm transition-colors';

export function Pagination({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(itemClass, 'hover:bg-muted')} rel="prev">
          <ChevronLeftIcon className="size-4" />
          <span className="sr-only sm:not-sr-only">Previous</span>
        </Link>
      ) : null}

      <ul className="flex items-center gap-1">
        {pageWindow(page, pages).map((item, index) =>
          item === null ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-sm text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={href(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  itemClass,
                  item === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ul>

      {page < pages ? (
        <Link href={href(page + 1)} className={cn(itemClass, 'hover:bg-muted')} rel="next">
          <span className="sr-only sm:not-sr-only">Next</span>
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
