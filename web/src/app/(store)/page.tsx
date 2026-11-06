import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Benefits } from '@/components/home/benefits';
import { CategoryTiles, CategoryTilesSkeleton } from '@/components/home/category-tiles';
import { PhotoFeature } from '@/components/home/photo-feature';
import { ReviewHighlights } from '@/components/home/review-highlights';
import { ProductGrid, ProductGridSkeleton } from '@/components/shop/product-grid';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { siteConfig } from '@/config/site';
import { getProductListing } from '@/lib/api/catalog';
import { getStoreConfig } from '@/lib/api/store';

const NEW_ARRIVALS = 8;
const ON_SALE = 4;

export default function HomePage() {
  const { home } = siteConfig;

  return (
    <main className="flex flex-col">
      <section className="page-container grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {home.eyebrow}
          </p>
          <h1 className="max-w-3xl text-5xl sm:text-7xl">{home.headline}</h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">{home.intro}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/shop">
                Shop all
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/shop?sale=1">Shop the sale</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-4/5 overflow-hidden rounded-md bg-muted">
          <Image
            src={home.heroImage.src}
            alt={home.heroImage.alt}
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <Benefits />
      </Suspense>

      <section className="page-container flex flex-col gap-8 pt-16">
        <h2 className="text-3xl sm:text-4xl">Shop by category</h2>
        <Suspense fallback={<CategoryTilesSkeleton />}>
          <CategoryTiles />
        </Suspense>
      </section>

      <section className="page-container flex flex-col gap-8 py-16">
        <SectionHeading title="New arrivals" href="/shop" linkLabel="View all" />
        <Suspense
          fallback={<ProductGridSkeleton count={NEW_ARRIVALS} className="xl:grid-cols-4" />}
        >
          <NewArrivals />
        </Suspense>
      </section>

      <section className="page-container grid gap-4 md:grid-cols-2">
        {home.features.map((feature) => (
          <PhotoFeature key={feature.href} {...feature} />
        ))}
      </section>

      <Suspense fallback={null}>
        <OnSale />
      </Suspense>

      <Suspense fallback={null}>
        <ReviewHighlights />
      </Suspense>

      <section className="page-container pb-16">
        <div className="grid overflow-hidden rounded-md border md:grid-cols-2">
          <div className="relative aspect-4/3 bg-muted md:aspect-auto md:min-h-96">
            <Image
              src={home.story.image.src}
              alt={home.story.image.alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-start justify-center gap-4 p-8 sm:p-12">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              {home.story.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl">{home.story.title}</h2>
            <p className="max-w-md text-muted-foreground">{home.story.text}</p>
            <Button asChild variant="outline">
              <Link href={home.story.href}>{home.story.cta}</Link>
            </Button>
          </div>
        </div>
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

async function NewArrivals() {
  const [listing, store] = await Promise.all([
    getProductListing({ sort: 'newest', pageSize: NEW_ARRIVALS }),
    getStoreConfig(),
  ]);

  if (listing.products.length === 0) {
    return (
      <Empty className="border px-6 py-16">
        <EmptyDescription>New pieces are on their way. Check back soon.</EmptyDescription>
      </Empty>
    );
  }

  return <ProductGrid products={listing.products} store={store} className="xl:grid-cols-4" />;
}

/** Reduced-price pieces; the section is left out when nothing is on sale. */
async function OnSale() {
  const [listing, store] = await Promise.all([
    getProductListing({ onSale: true, pageSize: ON_SALE }),
    getStoreConfig(),
  ]);
  if (listing.products.length === 0) return null;

  return (
    <section className="page-container flex flex-col gap-8 py-16">
      <SectionHeading title="On sale" href="/shop?sale=1" linkLabel="Shop the sale" />
      <ProductGrid products={listing.products} store={store} className="md:grid-cols-4" />
    </section>
  );
}
