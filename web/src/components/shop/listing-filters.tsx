import Link from 'next/link';
import { CheckIcon } from 'lucide-react';
import { fromMinorUnits, type Facet, type ProductListing, type StoreConfig } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  activeFilterCount,
  listingHref,
  toggleOption,
  type ListingState,
} from '@/lib/catalog/listing-params';
import { cn } from '@/lib/utils';
import { Swatch } from './swatch';

type FiltersProps = {
  pathname: string;
  state: ListingState;
  facets: Facet[];
  price: ProductListing['price'];
  store: StoreConfig;
  /** Distinguishes input ids when the filters render twice (sidebar and sheet). */
  idPrefix: string;
};

/**
 * Filters as plain links and a GET form: they work without JavaScript, and
 * every filtered view has its own shareable URL.
 */
export function ListingFilters({ pathname, state, facets, price, store, idPrefix }: FiltersProps) {
  const cleared = listingHref(pathname, state, {
    options: [],
    sale: false,
    min: undefined,
    max: undefined,
  });

  return (
    <div className="flex flex-col gap-8">
      {activeFilterCount(state) > 0 && (
        <Link href={cleared} className="text-sm underline underline-offset-4">
          Clear all filters
        </Link>
      )}

      <section className="flex flex-col gap-3">
        <GroupHeading>Offers</GroupHeading>
        <Link
          href={listingHref(pathname, state, { sale: !state.sale })}
          scroll={false}
          className="flex items-center gap-3 py-1 text-sm hover:text-muted-foreground"
        >
          <CheckMark selected={state.sale} />
          On sale
          {state.sale && <span className="sr-only">(selected)</span>}
        </Link>
      </section>

      {facets.map((facet) => (
        <FacetGroup key={facet.slug} facet={facet} pathname={pathname} state={state} />
      ))}

      {price && (
        <PriceFilter
          pathname={pathname}
          state={state}
          price={price}
          store={store}
          idPrefix={idPrefix}
        />
      )}
    </div>
  );
}

/** A checkbox look for filter links. */
function CheckMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-4 place-items-center rounded-xs border border-input',
        selected && 'border-primary bg-primary text-primary-foreground',
      )}
    >
      {selected && <CheckIcon className="size-3" />}
    </span>
  );
}

function GroupHeading({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </h3>
  );
}

function FacetGroup({
  facet,
  pathname,
  state,
}: {
  facet: Facet;
  pathname: string;
  state: ListingState;
}) {
  const link = (valueSlug: string) => {
    const option = `${facet.slug}:${valueSlug}`;
    return {
      href: listingHref(pathname, state, { options: toggleOption(state.options, option) }),
      selected: state.options.includes(option),
    };
  };

  return (
    <section className="flex flex-col gap-3">
      <GroupHeading>{facet.name}</GroupHeading>
      {facet.kind === 'color' ? (
        <ul className="flex flex-col gap-1">
          {facet.values.map((value) => {
            const { href, selected } = link(value.slug);
            return (
              <li key={value.slug}>
                <Link
                  href={href}
                  scroll={false}
                  className="flex items-center gap-3 py-1 text-sm hover:text-muted-foreground"
                >
                  <CheckMark selected={selected} />
                  {value.colorHex && (
                    <Swatch color={value.colorHex} label={value.label} className="size-4" />
                  )}
                  {value.label}
                  {selected && <span className="sr-only">(selected)</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {facet.values.map((value) => {
            const { href, selected } = link(value.slug);
            return (
              <li key={value.slug}>
                <Link
                  href={href}
                  scroll={false}
                  className={cn(
                    'flex h-9 min-w-10 items-center justify-center rounded-sm border px-3 text-sm transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-foreground',
                  )}
                >
                  {value.label}
                  {selected && <span className="sr-only"> (selected)</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PriceFilter({
  pathname,
  state,
  price,
  store,
  idPrefix,
}: {
  pathname: string;
  state: ListingState;
  price: NonNullable<ProductListing['price']>;
  store: StoreConfig;
  idPrefix: string;
}) {
  const lowest = Math.floor(fromMinorUnits(price.min, store.currency));
  const highest = Math.ceil(fromMinorUnits(price.max, store.currency));

  return (
    <section className="flex flex-col gap-3">
      <GroupHeading>Price</GroupHeading>
      {/* GET keeps the rest of the view; only the range is new. */}
      <form action={pathname} className="flex flex-col gap-3">
        {state.q && <input type="hidden" name="q" value={state.q} />}
        {state.options.map((option) => (
          <input key={option} type="hidden" name="option" value={option} />
        ))}
        {state.sale && <input type="hidden" name="sale" value="1" />}
        {state.sort !== 'newest' && <input type="hidden" name="sort" value={state.sort} />}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-min`} className="text-xs text-muted-foreground">
              Min ({store.currency})
            </Label>
            <Input
              id={`${idPrefix}-min`}
              name="min"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder={String(lowest)}
              defaultValue={state.min}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-max`} className="text-xs text-muted-foreground">
              Max ({store.currency})
            </Label>
            <Input
              id={`${idPrefix}-max`}
              name="max"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder={String(highest)}
              defaultValue={state.max}
            />
          </div>
        </div>
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
      </form>
    </section>
  );
}
