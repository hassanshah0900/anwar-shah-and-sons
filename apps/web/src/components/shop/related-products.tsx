import type { ProductDetail } from '@repo/shared';
import { getProductListing } from '@/lib/api/catalog';
import { getStoreConfig } from '@/lib/api/store';
import { ProductGrid } from './product-grid';

const COUNT = 4;

/**
 * Other products from the same category, topped up from its top-level category
 * (e.g. other Men's pieces after the kurtas) when there aren't enough.
 */
export async function RelatedProducts({ product }: { product: ProductDetail }) {
  const own = product.breadcrumbs.at(-1);
  const top = product.breadcrumbs[0];
  if (!own || !top) return null;

  const [nearest, wider, store] = await Promise.all([
    getProductListing({ category: own.slug, pageSize: COUNT + 1 }),
    own.slug === top.slug
      ? null
      : getProductListing({ category: top.slug, pageSize: COUNT * 2 + 1 }),
    getStoreConfig(),
  ]);
  const seen = new Set([product.id]);
  const others = [...nearest.products, ...(wider?.products ?? [])]
    .filter((other) => !seen.has(other.id) && seen.add(other.id))
    .slice(0, COUNT);
  if (others.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-8 border-t pt-12">
      <h2 id="related-heading" className="text-3xl">
        You may also like
      </h2>
      <ProductGrid products={others} store={store} className="md:grid-cols-4" />
    </section>
  );
}
