import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { categoryListSchema, optionTypeListSchema } from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { ProductStatusBadge } from '@/components/admin/product-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminProduct } from '@/lib/api/products';
import { ApiError, apiRequest } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { deleteProduct, updateProduct } from '../actions';
import { ProductForm } from '../product-form';

export const metadata: Metadata = { title: 'Edit product' };

type Params = Promise<{ id: string }>;

export default function EditProductPage({ params }: { params: Params }) {
  return (
    <main className="page-container py-12">
      <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
        ← Products
      </Link>
      <Suspense fallback={<Skeleton className="mt-6 h-96 w-full max-w-3xl" />}>
        <EditProduct params={params} />
      </Suspense>
    </main>
  );
}

async function EditProduct({ params }: { params: Params }) {
  const { id } = await params;
  const [product, { categories }, { optionTypes }, store] = await Promise.all([
    getAdminProduct(id).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    apiRequest('/api/v1/admin/categories', categoryListSchema),
    apiRequest('/api/v1/admin/option-types', optionTypeListSchema),
    getStoreConfig(),
  ]);

  return (
    <>
      <div className="mt-3 mb-8 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl">{product.name}</h1>
        <ProductStatusBadge status={product.status} />
        <div className="ml-auto">
          <ConfirmDeleteDialog
            title={`Delete ${product.name}?`}
            description="The product and all its variants are deleted. To hide it but keep its records, archive it instead."
            action={deleteProduct}
            fields={{ id: product.id }}
            label={`Delete ${product.name}`}
          />
        </div>
      </div>
      <ProductForm
        key={product.id}
        action={updateProduct}
        categories={categories}
        optionTypes={optionTypes}
        store={store}
        product={product}
      />
    </>
  );
}
