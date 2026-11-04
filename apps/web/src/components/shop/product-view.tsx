'use client';

import { useState, type ReactNode } from 'react';
import type { ProductDetail, StockLevel, StoreConfig } from '@repo/shared';
import {
  choose,
  imagesFor,
  priceRange,
  selectedVariant,
  selectionParams,
  valueState,
  type Selection,
} from '@/lib/catalog/variant-selection';
import { AddToBag } from '@/components/cart/add-to-bag';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';
import { OptionPicker } from './option-picker';
import { ProductGallery } from './product-gallery';

const stockDot: Record<StockLevel, string> = {
  in_stock: 'bg-foreground',
  low_stock: 'bg-muted-foreground',
  out_of_stock: 'bg-destructive',
};

const stockText: Record<StockLevel, string> = {
  in_stock: 'In stock',
  low_stock: 'Only a few left',
  out_of_stock: 'Out of stock',
};

/**
 * The interactive part of the product page: gallery, option pickers, the
 * price and stock of the chosen variant. The choice is mirrored into the URL
 * (?colour=black&size=m) so it survives a reload and can be shared.
 */
export function ProductView({
  product,
  store,
  initialSelection,
  header,
  children,
}: {
  product: ProductDetail;
  store: StoreConfig;
  initialSelection: Selection;
  /** Breadcrumbs and title, rendered on the server. */
  header: ReactNode;
  /** Details below the pickers, rendered on the server. */
  children?: ReactNode;
}) {
  const [selection, setSelection] = useState(initialSelection);

  // Only the shopper's own choices go into the URL; the default stays a clean link.
  const select = (next: Selection) => {
    setSelection(next);
    const search = selectionParams(product, next).toString();
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  };

  const variant = selectedVariant(product, selection);
  const images = imagesFor(product, selection);
  const missing = product.options.filter((option) => !selection[option.slug]);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <ProductGallery
        key={images.map((image) => image.key).join()}
        images={images}
        name={product.name}
      />

      <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-4">
          {header}
          <Price product={product} selection={selection} store={store} />
        </div>

        {product.options.map((option) => (
          <OptionPicker
            key={option.slug}
            option={option}
            selectedId={selection[option.slug]}
            stateOf={(valueId) => valueState(product, selection, option.slug, valueId)}
            onChoose={(valueId) => select(choose(product, selection, option.slug, valueId))}
          />
        ))}

        <div className="flex flex-col gap-3">
          <AddToBag variant={variant} missing={missing.map((option) => option.name)} />
          {variant && (
            <p
              aria-live="polite"
              className={cn(
                'flex items-center gap-2 text-sm',
                variant.stockLevel === 'out_of_stock'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn('size-2 rounded-full', stockDot[variant.stockLevel])}
              />
              {stockText[variant.stockLevel]}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

function Price({
  product,
  selection,
  store,
}: {
  product: ProductDetail;
  selection: Selection;
  store: StoreConfig;
}) {
  const { min, max } = priceRange(product, selection);
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > min;

  return (
    <p className="flex flex-wrap items-baseline gap-x-3 text-xl tabular-nums" aria-live="polite">
      <span>
        {formatPrice(min, store)}
        {max > min && ` – ${formatPrice(max, store)}`}
      </span>
      {onSale && (
        <s className="text-base text-muted-foreground">
          <span className="sr-only">Was </span>
          {formatPrice(product.compareAtPrice!, store)}
        </s>
      )}
    </p>
  );
}
