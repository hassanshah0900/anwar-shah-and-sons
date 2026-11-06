import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Pagination as PaginationRoot,
} from '@/components/ui/pagination';
import { pageWindow } from '@/lib/catalog/listing-params';

/**
 * Numbered page links with Previous and Next. Always shown, even for a single
 * page, so lists keep the same layout; steps that go nowhere are disabled.
 */
export function Pagination({
  page,
  pages,
  href,
  className,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
  className?: string;
}) {
  const last = Math.max(1, pages);

  return (
    <PaginationRoot className={className}>
      <PaginationContent className="gap-1">
        <PaginationItem>
          {page > 1 ? (
            <PaginationPrevious href={href(page - 1)} rel="prev" />
          ) : (
            <Button variant="ghost" disabled aria-label="Go to previous page" className="pl-1.5!">
              <ChevronLeftIcon data-icon="inline-start" />
              <span className="hidden sm:block">Previous</span>
            </Button>
          )}
        </PaginationItem>
        {pageWindow(page, last).map((item, index) => (
          <PaginationItem key={item ?? `gap-${index}`}>
            {item === null ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href={href(item)}
                isActive={item === page}
                aria-label={`Page ${item}`}
              >
                {item}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          {page < last ? (
            <PaginationNext href={href(page + 1)} rel="next" />
          ) : (
            <Button variant="ghost" disabled aria-label="Go to next page" className="pr-1.5!">
              <span className="hidden sm:block">Next</span>
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          )}
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}
