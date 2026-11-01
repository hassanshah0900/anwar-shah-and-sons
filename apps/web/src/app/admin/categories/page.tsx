import type { Metadata } from 'next';
import { Suspense } from 'react';
import { categoryListSchema } from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest } from '@/lib/api/server';
import { flattenCategoryTree } from '@/lib/catalog/category-tree';
import { deleteCategory } from './actions';
import { CategoryFormDialog } from './category-form-dialog';

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
  const tree = flattenCategoryTree(categories);
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Categories</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How products are grouped in the store, e.g. Women › Kurtas.
          </p>
        </div>
        <CategoryFormDialog categories={categories} />
      </div>

      {tree.length === 0 ? (
        <p className="mt-10 border border-dashed p-10 text-center text-sm text-muted-foreground">
          No categories yet. Create the first one, such as Women, Men or Kids.
        </p>
      ) : (
        <div className="mt-8 border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="w-0">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.map(({ category, depth }) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <span style={{ paddingLeft: `${depth * 1.25}rem` }}>
                      {depth > 0 && (
                        <span aria-hidden className="mr-2 text-muted-foreground">
                          └
                        </span>
                      )}
                      {category.name}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {category.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.parentId ? nameById.get(category.parentId) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <CategoryFormDialog categories={categories} category={category} />
                      <ConfirmDeleteDialog
                        title={`Delete ${category.name}?`}
                        description="This can't be undone. Categories with sub-categories can't be deleted."
                        action={deleteCategory}
                        fields={{ id: category.id }}
                        label={`Delete ${category.name}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
