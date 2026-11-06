import { serializeJsonLd } from '@/lib/seo/structured-data';

/** Structured data for search engines. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Safe: serializeJsonLd escapes "<", so the content can't break out of the tag.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
