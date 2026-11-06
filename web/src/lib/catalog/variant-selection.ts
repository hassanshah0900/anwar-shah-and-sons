import type { ProductDetail } from '@repo/shared';

/** Chosen value id per option slug, e.g. { colour: 'v1', size: 'v7' }. */
export type Selection = Record<string, string>;

type Variant = ProductDetail['variants'][number];

/** How a value looks next to what is already chosen. */
export type ValueState = 'available' | 'sold_out' | 'unavailable';

/** Variants that have every chosen value, ignoring the options listed in `except`. */
function matching(product: ProductDetail, selection: Selection, except?: string): Variant[] {
  const chosen = Object.entries(selection)
    .filter(([option]) => option !== except)
    .map(([, valueId]) => valueId);
  return product.variants.filter((variant) =>
    chosen.every((valueId) => variant.optionValueIds.includes(valueId)),
  );
}

/** The variant for the selection, once every option has a value. */
export function selectedVariant(product: ProductDetail, selection: Selection): Variant | null {
  if (product.options.some((option) => !selection[option.slug])) return null;
  return matching(product, selection)[0] ?? null;
}

/**
 * Whether choosing `valueId` for `optionSlug` leads to a variant that can be
 * bought, given the other options already chosen.
 */
export function valueState(
  product: ProductDetail,
  selection: Selection,
  optionSlug: string,
  valueId: string,
): ValueState {
  const candidates = matching(product, selection, optionSlug).filter((variant) =>
    variant.optionValueIds.includes(valueId),
  );
  if (candidates.length === 0) return 'unavailable';
  return candidates.some((variant) => variant.stockLevel !== 'out_of_stock')
    ? 'available'
    : 'sold_out';
}

/**
 * Chooses a value. Other choices that no longer combine with it into any
 * variant are dropped, so the shopper is never stuck on an impossible pair.
 */
export function choose(
  product: ProductDetail,
  selection: Selection,
  optionSlug: string,
  valueId: string,
): Selection {
  const next: Selection = { ...selection, [optionSlug]: valueId };
  for (const [option, chosen] of Object.entries(next)) {
    if (option === optionSlug) continue;
    const combines = product.variants.some(
      (variant) =>
        variant.optionValueIds.includes(valueId) && variant.optionValueIds.includes(chosen),
    );
    if (!combines) delete next[option];
  }
  return next;
}

/** Lowest and highest price among variants that still fit the selection. */
export function priceRange(
  product: ProductDetail,
  selection: Selection,
): { min: number; max: number } {
  const prices = matching(product, selection).map((variant) => variant.price);
  if (prices.length === 0) return { min: product.price, max: product.price };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * The starting selection: values named in the URL (by slug), then any option
 * with a single value, then the first colour that is in stock.
 */
export function initialSelection(
  product: ProductDetail,
  params: Record<string, string | string[] | undefined>,
): Selection {
  let selection: Selection = {};
  for (const option of product.options) {
    const raw = params[option.slug];
    const slug = Array.isArray(raw) ? raw[0] : raw;
    const value = option.values.find((candidate) => candidate.slug === slug);
    if (value) selection = choose(product, selection, option.slug, value.id);
  }
  for (const option of product.options) {
    if (selection[option.slug]) continue;
    if (option.values.length === 1) {
      selection = choose(product, selection, option.slug, option.values[0]!.id);
    } else if (option.kind === 'color') {
      const inStock = option.values.find(
        (value) => valueState(product, selection, option.slug, value.id) === 'available',
      );
      if (inStock) selection = choose(product, selection, option.slug, inStock.id);
    }
  }
  return selection;
}

/** The selection as URL params, by slug, e.g. "colour=black&size=m". */
export function selectionParams(product: ProductDetail, selection: Selection): URLSearchParams {
  const params = new URLSearchParams();
  for (const option of product.options) {
    const value = option.values.find((candidate) => candidate.id === selection[option.slug]);
    if (value) params.set(option.slug, value.slug);
  }
  return params;
}

/**
 * Images to show: when some images belong to a chosen value (such as a colour),
 * those plus the shared ones; otherwise all of them.
 */
export function imagesFor(product: ProductDetail, selection: Selection): ProductDetail['images'] {
  const chosen = new Set(Object.values(selection));
  const tied = product.images.filter(
    (image) => image.optionValueId && chosen.has(image.optionValueId),
  );
  if (tied.length === 0) return product.images;
  return [...tied, ...product.images.filter((image) => !image.optionValueId)];
}
