import { describe, expect, it, vi } from 'vitest';
import type { ProductDetail, StoreConfig } from '@repo/shared';
import { breadcrumbJsonLd, productJsonLd, serializeJsonLd } from './structured-data';

const store: StoreConfig = {
  currency: 'PKR',
  locale: 'en-PK',
  shipping: { flatRate: 250, freeOver: null },
};

const product: ProductDetail = {
  id: 'p1',
  name: 'Lawn Kurta',
  slug: 'lawn-kurta',
  description: 'Soft lawn.',
  price: 4990,
  compareAtPrice: null,
  breadcrumbs: [],
  options: [],
  variants: [
    { id: 'a', optionValueIds: [], price: 4990, stockLevel: 'out_of_stock' },
    { id: 'b', optionValueIds: [], price: 5490, stockLevel: 'low_stock' },
  ],
  images: [{ key: 'products/p1/a.jpg', alt: '', optionValueId: null }],
};

describe('productJsonLd', () => {
  it('describes a price range and stock with absolute URLs', () => {
    vi.stubEnv('SITE_URL', 'https://shop.example');
    expect(productJsonLd(product, store)).toMatchObject({
      '@type': 'Product',
      url: 'https://shop.example/products/lawn-kurta',
      image: ['https://shop.example/media/products/p1/a.jpg'],
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '4990',
        highPrice: '5490',
        priceCurrency: 'PKR',
        availability: 'https://schema.org/InStock',
      },
    });
  });

  it('uses a single offer with decimals for currencies that have them', () => {
    const usd = { ...store, currency: 'USD' };
    const single = { ...product, variants: [product.variants[0]!] };
    expect(productJsonLd(single, usd).offers).toMatchObject({
      '@type': 'Offer',
      price: '49.90',
      availability: 'https://schema.org/OutOfStock',
    });
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the trail from 1', () => {
    vi.stubEnv('SITE_URL', 'https://shop.example');
    expect(breadcrumbJsonLd([{ name: 'Home', href: '/' }]).itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://shop.example/' },
    ]);
  });
});

describe('serializeJsonLd', () => {
  it('cannot close the script tag', () => {
    expect(serializeJsonLd({ description: '</script><script>alert(1)' })).not.toContain('<');
  });
});
