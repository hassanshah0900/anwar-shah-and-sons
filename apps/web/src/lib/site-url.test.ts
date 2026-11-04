import { describe, expect, it, vi } from 'vitest';
import { absoluteUrl, siteUrl } from './site-url';

describe('siteUrl', () => {
  it('defaults to the local dev server', () => {
    vi.stubEnv('SITE_URL', '');
    expect(absoluteUrl('/shop')).toBe('http://localhost:3000/shop');
  });

  it('uses SITE_URL', () => {
    vi.stubEnv('SITE_URL', 'https://anwarshahandsons.pk');
    expect(absoluteUrl('/products/lawn-kurta')).toBe(
      'https://anwarshahandsons.pk/products/lawn-kurta',
    );
  });

  it('rejects a relative SITE_URL', () => {
    vi.stubEnv('SITE_URL', 'shop.example');
    expect(() => siteUrl()).toThrow(/SITE_URL/);
  });
});
