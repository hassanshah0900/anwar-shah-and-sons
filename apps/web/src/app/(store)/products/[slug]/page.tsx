import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageBreadcrumbs } from '@/components/layout/page-breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { ProductView } from '@/components/shop/product-view';
import { Skeleton } from '@/components/ui/skeleton';
import { getProductDetail } from '@/lib/api/catalog';
import { ApiError } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { initialSelection } from '@/lib/catalog/variant-selection';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/structured-data';

type Props = PageProps<'/products/[slug]'>;

/** The product, or the 404 page when it doesn't exist or isn't published. */
async function loadProduct(slug: string) {
  try {
    return await getProductDetail(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await loadProduct((await params).slug);
  const description = product.description?.slice(0, 160) ?? `Shop ${product.name}.`;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    // Variant choices (?colour=…&size=…) are the same page.
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: image ? [{ url: `/media/${image.key}`, alt: image.alt || product.name }] : [],
    },
  };
}

export default function ProductPage({ params, searchParams }: Props) {
  return (
    <main className="page-container py-10">
      <Suspense fallback={<ProductSkeleton />}>
        <Product params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Product({ params, searchParams }: Props) {
  const [product, store, query] = await Promise.all([
    params.then(({ slug }) => loadProduct(slug)),
    getStoreConfig(),
    searchParams,
  ]);
  const crumbs = [
    { name: 'Home', href: '/' },
    ...product.breadcrumbs.map((crumb) => ({ name: crumb.name, href: `/shop/${crumb.slug}` })),
  ];

  return (
    <>
      <JsonLd data={productJsonLd(product, store)} />
      <JsonLd
        data={breadcrumbJsonLd([
          ...crumbs,
          { name: product.name, href: `/products/${product.slug}` },
        ])}
      />
      <ProductView
        product={product}
        store={store}
        initialSelection={initialSelection(product, query)}
        header={
          <>
            <PageBreadcrumbs crumbs={crumbs} />
            <h1 className="text-4xl sm:text-5xl">{product.name}</h1>
          </>
        }
      >
        {product.description && (
          <section className="flex flex-col gap-3 border-t pt-8">
            <h2 className="font-sans text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Details
            </h2>
            <p className="text-sm leading-7 whitespace-pre-line">{product.description}</p>
          </section>
        )}
      </ProductView>
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16" aria-busy aria-label="Loading product">
      <Skeleton className="aspect-3/4 w-full rounded-md" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-6 h-10 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>
    </div>
  );
}
