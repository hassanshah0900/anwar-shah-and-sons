import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { ProductGrid, ProductGridSkeleton } from '@/components/shop/product-grid';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { siteConfig } from '@/config/site';
import { getCategories, getProductListing } from '@/lib/api/catalog';
import { getStoreConfig } from '@/lib/api/store';

const NEW_ARRIVALS = 8;

export default function HomePage() {
  const { home } = siteConfig;

  return (
    <main className="flex flex-col">
      <section className="border-b">
        <div className="page-container flex flex-col items-start gap-6 py-20 sm:py-28">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {home.eyebrow}
          </p>
          <h1 className="max-w-3xl text-5xl sm:text-7xl">{home.headline}</h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">{home.intro}</p>
          <Button asChild size="lg">
            <Link href="/shop">
              Shop all
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>

      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories />
      </Suspense>

      <section className="page-container flex flex-col gap-8 py-16">
        <SectionHeading title="New arrivals" href="/shop" linkLabel="View all" />
        <Suspense
          fallback={<ProductGridSkeleton count={NEW_ARRIVALS} className="xl:grid-cols-4" />}
        >
          <NewArrivals />
        </Suspense>
      </section>
    </main>
  );
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      <Link
        href={href}
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {linkLabel}
        <ArrowRightIcon className="size-4" />
      </Link>
    </div>
  );
}

async function Categories() {
  const topLevel = (await getCategories()).filter((category) => category.parentId === null);
  if (topLevel.length === 0) return null;

  return (
    <section className="page-container flex flex-col gap-8 pt-16">
      <h2 className="text-3xl sm:text-4xl">Shop by category</h2>
      <ul className="grid border-t border-l sm:grid-cols-2 lg:grid-cols-3">
        {topLevel.map((category) => (
          <li key={category.id} className="border-r border-b">
            <Link
              href={`/shop/${category.slug}`}
              className="group flex h-full min-h-40 flex-col justify-between gap-6 p-6 transition-colors hover:bg-muted"
            >
              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-3xl font-normal">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>
              <span className="flex items-center gap-1 text-sm">
                Shop {category.name}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="page-container flex flex-col gap-8 pt-16">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

async function NewArrivals() {
  const [listing, store] = await Promise.all([
    getProductListing({ sort: 'newest', pageSize: NEW_ARRIVALS }),
    getStoreConfig(),
  ]);

  if (listing.products.length === 0) {
    return (
      <p className="border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
        New pieces are on their way. Check back soon.
      </p>
    );
  }

  return <ProductGrid products={listing.products} store={store} className="xl:grid-cols-4" />;
}
