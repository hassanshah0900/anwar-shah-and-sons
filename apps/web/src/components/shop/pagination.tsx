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

/** Numbered page links; renders nothing when everything fits on one page. */
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
    <PaginationRoot>
      <PaginationContent className="gap-1">
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={href(page - 1)} rel="prev" />
          </PaginationItem>
        )}
        {pageWindow(page, pages).map((item, index) => (
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
        {page < pages && (
          <PaginationItem>
            <PaginationNext href={href(page + 1)} rel="next" />
          </PaginationItem>
        )}
      </PaginationContent>
    </PaginationRoot>
  );
}
