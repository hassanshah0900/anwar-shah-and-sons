import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ShopHeader } from '@/components/shop/shop-header';
import { ShopListing, ShopListingSkeleton } from '@/components/shop/shop-listing';
import { getCategories } from '@/lib/api/catalog';
import { ancestorsOf } from '@/lib/catalog/category-tree';
import { readListingState } from '@/lib/catalog/listing-params';

type Props = PageProps<'/shop/[category]'>;

async function findCategory(slug: string) {
  const categories = await getCategories();
  const category = categories.find((candidate) => candidate.slug === slug);
  return category ? { category, categories } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await findCategory((await params).category);
  if (!found) notFound();
  const { category } = found;
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} at Anwar Shah & Sons.`,
    // Filters, sorting and pages are views of the same category.
    alternates: { canonical: `/shop/${category.slug}` },
  };
}

export default function CategoryPage({ params, searchParams }: Props) {
  return (
    <main className="page-container py-10">
      <Suspense fallback={<ShopListingSkeleton />}>
        <CategoryShop params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function CategoryShop({ params, searchParams }: Props) {
  const found = await findCategory((await params).category);
  if (!found) notFound();
  const { category, categories } = found;

  const pathname = `/shop/${category.slug}`;
  const state = readListingState(await searchParams);
  const children = categories.filter((candidate) => candidate.parentId === category.id);

  return (
    <>
      <ShopHeader
        title={category.name}
        description={category.description}
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Shop', href: '/shop' },
          ...ancestorsOf(categories, category.id).map((ancestor) => ({
            name: ancestor.name,
            href: `/shop/${ancestor.slug}`,
          })),
        ]}
        links={children.map((child) => ({ name: child.name, href: `/shop/${child.slug}` }))}
      />
      <ShopListing pathname={pathname} state={state} category={category.slug} />
    </>
  );
}
