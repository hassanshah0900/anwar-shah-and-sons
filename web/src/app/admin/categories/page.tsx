import type { Metadata } from 'next';
import { Suspense } from 'react';
import { categoryListSchema } from '@repo/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/server';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { CategoryFormDialog } from './category-form-dialog';
import { CategoryTree } from './category-tree';

export const metadata: Metadata = { title: 'Categories' };

export default function CategoriesPage() {
  return (
    <main className="page-container py-12">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Categories />
      </Suspense>
    </main>
  );
}

async function Categories() {
  const { categories } = await apiRequest('/api/v1/admin/categories', categoryListSchema);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Categories</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How products are grouped in the store, e.g. Women › Kurtas. Drag to change the order
            they're shown in.
          </p>
        </div>
        <CategoryFormDialog categories={categories} />
      </div>

      {categories.length === 0 ? (
        <Empty className="mt-10 border p-10">
          <EmptyDescription>
            No categories yet. Create the first one, such as Women, Men or Kids.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="mt-8">
          <CategoryTree categories={categories} />
        </div>
      )}
    </>
  );
}
