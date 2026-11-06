import Image from 'next/image';
import Link from 'next/link';
import type { ProductCard as ProductCardData, StoreConfig } from '@repo/shared';
import { RatingSummary } from '@/components/reviews/stars';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/money';
import { Swatch } from './swatch';

const MAX_SWATCHES = 5;

export function ProductCard({
  product,
  store,
  preload = false,
}: {
  product: ProductCardData;
  store: StoreConfig;
  /** Load the image eagerly: for cards visible without scrolling. */
  preload?: boolean;
}) {
  const ranged = product.priceFrom !== product.priceTo;
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.priceFrom;
  const extraColors = product.colors.length - MAX_SWATCHES;

  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative aspect-3/4 overflow-hidden rounded-md bg-muted">
        {product.image ? (
          <Image
            src={`/media/${product.image.key}`}
            alt={product.image.alt || product.name}
            fill
            preload={preload}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-opacity group-hover:opacity-90"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            No image
          </span>
        )}
        {!product.inStock ? <Label>Sold out</Label> : onSale && <Label>Sale</Label>}
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-normal">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
          <span>
            {ranged && 'From '}
            {formatPrice(product.priceFrom, store)}
          </span>
          {onSale && (
            <s className="text-muted-foreground">
              <span className="sr-only">Was </span>
              {formatPrice(product.compareAtPrice!, store)}
            </s>
          )}
        </p>
        <RatingSummary rating={product.rating} className="text-xs" />
        {product.colors.length > 1 && (
          <p className="flex items-center gap-1.5">
            {product.colors
              .slice(0, MAX_SWATCHES)
              .map((color) =>
                color.colorHex ? (
                  <Swatch
                    key={color.slug}
                    color={color.colorHex}
                    label={color.label}
                    className="size-3"
                  />
                ) : null,
              )}
            {extraColors > 0 && (
              <span className="text-xs text-muted-foreground">+{extraColors}</span>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

/** A label on the card image; neutral, like the rest of the system. */
function Label({ children }: { children: string }) {
  return (
    <span className="absolute top-2 left-2 rounded-sm bg-background px-2 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-3/4 w-full rounded-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}
