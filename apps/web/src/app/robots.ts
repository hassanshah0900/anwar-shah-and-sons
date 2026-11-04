import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site-url';

/** Crawl the shop; keep private and per-visitor pages out of search results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/cart', '/checkout', '/api/', '/reset-password'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
