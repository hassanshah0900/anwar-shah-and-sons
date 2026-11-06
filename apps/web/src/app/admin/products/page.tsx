import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  DEFAULT_PAGE_SIZE,
  productListQuerySchema,
  productStatuses,
  type ProductListQuery,
} from '@repo/shared';
import { ProductStatusBadge } from '@/components/admin/product-status-badge';
import { ListFooter } from '@/components/lists/list-footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAdminProducts } from '@/lib/api/products';
import { getStoreConfig } from '@/lib/api/store';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Empty, EmptyDescription } from '@/components/ui/empty';

export const metadata: Metadata = { title: 'Products' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="page-container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>
      <Suspense fallback={<Skeleton className="mt-8 h-96 w-full" />}>
        <Products searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Products({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const parsed = productListQuerySchema.safeParse({
    status: raw.status,
    q: raw.q || undefined,
    page: raw.page,
    pageSize: raw.pageSize,
  });
  const query: ProductListQuery = parsed.success
    ? parsed.data
    : { page: 1, pageSize: DEFAULT_PAGE_SIZE };

  const [{ products, total }, store] = await Promise.all([
    getAdminProducts(query),
    getStoreConfig(),
  ]);
  const href = (changes: Partial<ProductListQuery>) => {
    const params = new URLSearchParams();
    const next = { ...query, ...changes };
    if (next.status) params.set('status', next.status);
    if (next.q) params.set('q', next.q);
    if (next.page > 1) params.set('page', String(next.page));
    if (next.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(next.pageSize));
    const search = params.toString();
    return `/admin/products${search ? `?${search}` : ''}`;
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter by status" className="flex gap-1">
          {[undefined, ...productStatuses].map((status) => (
            <Link
              key={status ?? 'all'}
              href={href({ status, page: 1 })}
              aria-current={query.status === status ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
                query.status === status
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {status ?? 'All'}
            </Link>
          ))}
        </nav>
        <form role="search" className="flex gap-2">
          {query.status && <input type="hidden" name="status" value={query.status} />}
          {query.pageSize !== DEFAULT_PAGE_SIZE && (
            <input type="hidden" name="pageSize" value={query.pageSize} />
          )}
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <Input
            id="product-search"
            name="q"
            type="search"
            placeholder="Name or SKU"
            defaultValue={query.q}
            className="w-56"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {products.length === 0 ? (
        <Empty className="mt-8 border p-10">
          <EmptyDescription>
            {query.q || query.status ? 'No products match.' : 'No products yet.'}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="mt-6 border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Variants</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.category.name}</TableCell>
                  <TableCell>
                    <ProductStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(product.price, store)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{product.variantCount}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      product.totalStock === 0 && 'text-destructive',
                    )}
                  >
                    {product.totalStock}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ListFooter
        summary={`${total} ${total === 1 ? 'product' : 'products'}`}
        total={total}
        page={query.page}
        pageSize={query.pageSize}
        href={(page) => href({ page })}
      />
    </>
  );
}
