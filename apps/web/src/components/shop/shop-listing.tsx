import Link from 'next/link';
import type { ProductSort } from '@repo/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { getProductListing } from '@/lib/api/catalog';
import { getStoreConfig } from '@/lib/api/store';
import {
  activeFilterCount,
  listingHref,
  PAGE_SIZE,
  toListingQuery,
  type ListingState,
} from '@/lib/catalog/listing-params';
import { FilterSheet } from './filter-sheet';
import { ListingFilters } from './listing-filters';
import { Pagination } from './pagination';
import { ProductGrid, ProductGridSkeleton } from './product-grid';
import { SortMenu } from './sort-menu';
import { Empty, EmptyContent, EmptyDescription } from '@/components/ui/empty';

const sortLabels: Record<ProductSort, string> = {
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
};

const layoutClass = 'grid gap-10 lg:grid-cols-[14rem_1fr]';

/** Filters, sort, product grid and pagination for one shop page. */
export async function ShopListing({
  pathname,
  state,
  category,
}: {
  pathname: string;
  state: ListingState;
  /** Limits the listing to this category and its sub-categories. */
  category?: string;
}) {
  const store = await getStoreConfig();
  const listing = await getProductListing(toListingQuery(state, store.currency, category));
  const pages = Math.max(1, Math.ceil(listing.total / PAGE_SIZE));
  const filterCount = activeFilterCount(state);

  const filters = (idPrefix: string) => (
    <ListingFilters
      pathname={pathname}
      state={state}
      facets={listing.facets}
      price={listing.price}
      store={store}
      idPrefix={idPrefix}
    />
  );
  const sortChoices = (Object.keys(sortLabels) as ProductSort[]).map((sort) => ({
    label: sortLabels[sort],
    href: listingHref(pathname, state, { sort }),
    active: state.sort === sort,
  }));

  return (
    <div className={layoutClass}>
      <aside aria-label="Filters" className="hidden lg:block">
        {filters('sidebar')}
      </aside>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <FilterSheet count={filterCount}>{filters('sheet')}</FilterSheet>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {listing.total} {listing.total === 1 ? 'product' : 'products'}
            </p>
          </div>
          <SortMenu choices={sortChoices} />
        </div>

        {listing.products.length === 0 ? (
          <Empty className="gap-3 border px-6 py-16">
            <EmptyDescription>
              {filterCount > 0 || state.q
                ? 'No products match your selection.'
                : 'Nothing here yet. Check back soon.'}
            </EmptyDescription>
            {filterCount > 0 && (
              <EmptyContent>
                <Link
                  href={listingHref(pathname, state, {
                    options: [],
                    min: undefined,
                    max: undefined,
                  })}
                  className="text-sm underline underline-offset-4"
                >
                  Clear filters
                </Link>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <ProductGrid products={listing.products} store={store} />
        )}

        <Pagination
          page={state.page}
          pages={pages}
          href={(page) => listingHref(pathname, state, { page })}
        />
      </div>
    </div>
  );
}

export function ShopListingSkeleton() {
  return (
    <div className={layoutClass}>
      <div className="hidden flex-col gap-4 lg:flex">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-full" />
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
