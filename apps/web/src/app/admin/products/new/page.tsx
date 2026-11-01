import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { categoryListSchema, optionTypeListSchema } from '@repo/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { createProduct } from '../actions';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'New product' };

export default function NewProductPage() {
  return (
    <main className="page-container py-12">
      <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
        ← Products
      </Link>
      <h1 className="mt-3 mb-8 text-4xl">New product</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-3xl" />}>
        <NewProductForm />
      </Suspense>
    </main>
  );
}

async function NewProductForm() {
  const [{ categories }, { optionTypes }, store] = await Promise.all([
    apiRequest('/api/v1/admin/categories', categoryListSchema),
    apiRequest('/api/v1/admin/option-types', optionTypeListSchema),
    getStoreConfig(),
  ]);

  if (categories.length === 0) {
    return (
      <p className="max-w-xl border border-dashed p-8 text-sm text-muted-foreground">
        Products belong to a category.{' '}
        <Link href="/admin/categories" className="text-foreground underline underline-offset-4">
          Create a category
        </Link>{' '}
        first.
      </p>
    );
  }

  return (
    <ProductForm
      action={createProduct}
      categories={categories}
      optionTypes={optionTypes}
      store={store}
    />
  );
}
