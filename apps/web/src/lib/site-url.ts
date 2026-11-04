/**
 * The public URL of the store, for absolute links in metadata, the sitemap and
 * structured data. Read when pages are built, so set SITE_URL for builds too.
 */
export function siteUrl(): URL {
  const value = process.env.SITE_URL;
  try {
    return new URL(value || 'http://localhost:3000');
  } catch {
    throw new Error(`SITE_URL must be an absolute URL, got "${value}"`);
  }
}

/** An absolute URL on the store for a path such as "/products/lawn-kurta". */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
