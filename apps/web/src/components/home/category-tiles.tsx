import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories, getProductListing } from '@/lib/api/catalog';

/** Top-level categories as photo tiles, each shown with its newest product's photo. */
export async function CategoryTiles() {
  const topLevel = (await getCategories()).filter((category) => category.parentId === null);
  if (topLevel.length === 0) return null;

  const tiles = await Promise.all(
    topLevel.map(async (category) => {
      const { products } = await getProductListing({ category: category.slug, pageSize: 1 });
      return { category, image: products[0]?.image ?? null };
    }),
  );

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map(({ category, image }) => (
        <li key={category.id}>
          <Link
            href={`/shop/${category.slug}`}
            className="group relative flex aspect-4/3 items-end overflow-hidden rounded-md bg-muted sm:aspect-4/5"
          >
            {image && (
              <Image
                src={`/media/${image.key}`}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            {/* A solid panel keeps the text readable on any photo. */}
            <div className="relative m-4 flex w-full flex-col gap-1 rounded-sm bg-background p-5">
              <h3 className="font-heading text-3xl font-normal">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
              <span className="flex items-center gap-1 text-sm">
                Shop {category.name}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryTilesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="aspect-4/3 w-full sm:aspect-4/5" />
      ))}
    </div>
  );
}
