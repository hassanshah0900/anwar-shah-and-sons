import type { MetadataRoute } from 'next';
import { getCategories, getProductListing } from '@/lib/api/catalog';
import { absoluteUrl } from '@/lib/site-url';

const STATIC_PATHS = ['/', '/shop', '/about', '/contact', '/shipping', '/returns'];
/** The listing's largest page size; the sitemap walks every page. */
const PAGE_SIZE = 48;

/**
 * Every public page: the fixed pages, each category and each active product.
 * Built per request from the catalog, so new products appear straight away.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, productSlugs] = await Promise.all([getCategories(), allProductSlugs()]);

  return [
    ...STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) })),
    ...categories.map((category) => ({ url: absoluteUrl(`/shop/${category.slug}`) })),
    ...productSlugs.map((slug) => ({ url: absoluteUrl(`/products/${slug}`) })),
  ];
}

async function allProductSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  for (let page = 1; ; page++) {
    const { products, total } = await getProductListing({ page, pageSize: PAGE_SIZE });
    slugs.push(...products.map((product) => product.slug));
    if (slugs.length >= total || products.length === 0) return slugs;
  }
}
