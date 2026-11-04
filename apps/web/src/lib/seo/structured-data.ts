import {
  currencyExponent,
  fromMinorUnits,
  type ProductDetail,
  type StoreConfig,
} from '@repo/shared';
import { siteConfig } from '@/config/site';
import { absoluteUrl } from '@/lib/site-url';

/**
 * schema.org data for search engines (rich results with price and stock).
 * See https://developers.google.com/search/docs/appearance/structured-data/product
 */

type Crumb = { name: string; href: string };

/** schema.org wants decimal prices in major units, e.g. "4990" or "49.90". */
function price(minor: number, currency: string): string {
  return fromMinorUnits(minor, currency).toFixed(currencyExponent(currency));
}

export function productJsonLd(product: ProductDetail, store: StoreConfig) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const prices = product.variants.map((variant) => variant.price);
  const low = prices.length ? Math.min(...prices) : product.price;
  const high = prices.length ? Math.max(...prices) : product.price;
  const inStock = product.variants.some((variant) => variant.stockLevel !== 'out_of_stock');
  const availability = `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    ...(product.description && { description: product.description }),
    image: product.images.map((image) => absoluteUrl(`/media/${image.key}`)),
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers:
      low === high
        ? {
            '@type': 'Offer',
            url,
            price: price(low, store.currency),
            priceCurrency: store.currency,
            availability,
          }
        : {
            '@type': 'AggregateOffer',
            url,
            lowPrice: price(low, store.currency),
            highPrice: price(high, store.currency),
            offerCount: product.variants.length,
            priceCurrency: store.currency,
            availability,
          },
  };
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.href),
    })),
  };
}

/**
 * Serialises for a <script> tag. "<" is escaped so text from the catalog
 * (a description containing "</script>") can't end the tag early.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
