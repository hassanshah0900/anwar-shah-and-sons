import type { ProductCard as ProductCardData, StoreConfig } from '@repo/shared';
import { cn } from '@/lib/utils';
import { ProductCard, ProductCardSkeleton } from './product-card';

const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3';

export function ProductGrid({
  products,
  store,
  className,
}: {
  products: ProductCardData[];
  store: StoreConfig;
  className?: string;
}) {
  return (
    <ul className={cn(gridClass, className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} store={store} preload={index < 4} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(gridClass, className)} aria-busy aria-label="Loading products">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
