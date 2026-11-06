import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchIcon } from 'lucide-react';
import { ShopHeader } from '@/components/shop/shop-header';
import { ShopListing, ShopListingSkeleton } from '@/components/shop/shop-listing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readListingState } from '@/lib/catalog/listing-params';

/** Filtered and sorted views point search engines at the plain listing; searches aren't indexed. */
export async function generateMetadata({ searchParams }: PageProps<'/shop'>): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${String(q)}` : 'Shop all',
    description: 'Browse every product at Anwar Shah & Sons.',
    alternates: { canonical: '/shop' },
    ...(q && { robots: { index: false, follow: true } }),
  };
}

export default function ShopPage({ searchParams }: PageProps<'/shop'>) {
  return (
    <main className="page-container py-10">
      <Suspense fallback={<ShopListingSkeleton />}>
        <Shop searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Shop({ searchParams }: Pick<PageProps<'/shop'>, 'searchParams'>) {
  const state = readListingState(await searchParams);

  return (
    <>
      <ShopHeader
        title={state.q ? `Results for “${state.q}”` : 'Shop all'}
        breadcrumbs={[{ name: 'Home', href: '/' }]}
      >
        <form role="search" action="/shop" className="flex max-w-md gap-2">
          <label htmlFor="shop-search" className="sr-only">
            Search products
          </label>
          <Input
            id="shop-search"
            name="q"
            type="search"
            placeholder="Search products"
            defaultValue={state.q}
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <SearchIcon />
          </Button>
        </form>
      </ShopHeader>
      <ShopListing pathname="/shop" state={state} />
    </>
  );
}
