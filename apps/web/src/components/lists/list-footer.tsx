import type { ReactNode } from 'react';
import { Pagination } from '@/components/shop/pagination';
import { listConfig } from '@/config/lists';
import { PageSizeSelect } from './page-size-select';

/**
 * The row under a paginated table: a count on the left, then the page size
 * and page links. The size choice only shows once there's more than its smallest option.
 */
export function ListFooter({
  summary,
  total,
  page,
  pageSize,
  href,
}: {
  summary: ReactNode;
  total: number;
  page: number;
  pageSize: number;
  /** The URL of another page, keeping the rest of the view. */
  href: (page: number) => string;
}) {
  const showSizes = total > Math.min(...listConfig.pageSizes);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">{summary}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {showSizes && <PageSizeSelect pageSize={pageSize} sizes={listConfig.pageSizes} />}
        <Pagination
          page={page}
          pages={Math.ceil(total / pageSize)}
          href={href}
          className="mx-0 w-auto"
        />
      </div>
    </div>
  );
}
