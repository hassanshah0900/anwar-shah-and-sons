import {
  productSorts,
  toMinorUnits,
  type ProductListingQuery,
  type ProductSort,
} from '@repo/shared';

export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * What a shop page shows, as kept in its URL. Prices are in major units
 * (what shoppers type); filters are "<option-slug>:<value-slug>" pairs.
 */
export type ListingState = {
  q?: string;
  options: string[];
  /** Only products with a reduced price. */
  sale: boolean;
  min?: number;
  max?: number;
  sort: ProductSort;
  page: number;
};

export const PAGE_SIZE = 24;

const OPTION_PATTERN = /^[a-z0-9-]+:[a-z0-9-]+$/;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const all = (value: string | string[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

function amount(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const number = Number(value.replaceAll(',', ''));
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

/** Reads shop URL params leniently: anything invalid falls back to the default. */
export function readListingState(params: SearchParams): ListingState {
  const page = Number(first(params.page));
  return {
    q: first(params.q)?.trim().slice(0, 100) || undefined,
    options: [...new Set(all(params.option).filter((value) => OPTION_PATTERN.test(value)))].sort(),
    sale: ['1', 'true'].includes(first(params.sale) ?? ''),
    min: amount(first(params.min)),
    max: amount(first(params.max)),
    sort: productSorts.find((sort) => sort === first(params.sort)) ?? 'newest',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** The API query for a shop page. */
export function toListingQuery(
  state: ListingState,
  currency: string,
  category?: string,
): Partial<ProductListingQuery> {
  return {
    category,
    q: state.q,
    option: state.options,
    onSale: state.sale || undefined,
    minPrice: state.min === undefined ? undefined : toMinorUnits(state.min, currency),
    maxPrice: state.max === undefined ? undefined : toMinorUnits(state.max, currency),
    sort: state.sort,
    page: state.page,
    pageSize: PAGE_SIZE,
  };
}

/**
 * A link to the same shop page with some state changed. Any change other than
 * the page number goes back to page 1, since the results differ.
 */
export function listingHref(
  pathname: string,
  state: ListingState,
  changes: Partial<ListingState> = {},
): string {
  const next = { ...state, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  for (const option of next.options) params.append('option', option);
  if (next.sale) params.set('sale', '1');
  if (next.min !== undefined) params.set('min', String(next.min));
  if (next.max !== undefined) params.set('max', String(next.max));
  if (next.sort !== 'newest') params.set('sort', next.sort);
  if (next.page > 1) params.set('page', String(next.page));
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** Adds the filter if it is off, removes it if it is on. */
export function toggleOption(options: string[], option: string): string[] {
  return options.includes(option)
    ? options.filter((value) => value !== option)
    : [...options, option].sort();
}

export function activeFilterCount(state: ListingState): number {
  return (
    state.options.length +
    (state.sale ? 1 : 0) +
    (state.min !== undefined || state.max !== undefined ? 1 : 0)
  );
}

/**
 * Page numbers to show, with null for a gap: 1 … 4 5 6 … 12.
 * Always includes the first, last and current page and the current page's neighbours.
 */
export function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  return sorted.flatMap((page, index) => {
    const previous = sorted[index - 1];
    if (previous === undefined || page === previous + 1) return [page];
    // A gap of exactly one page shows that page instead of an ellipsis.
    return page === previous + 2 ? [previous + 1, page] : [null, page];
  });
}
