import type { Product } from '@repo/shared';
import { asc, eq } from 'drizzle-orm';
import { orNotFound, type Queryable } from '../../db/queries.js';
import { productImages, productOptions, products, productVariants } from '../../db/schema/index.js';

/** A product as the admin sees it, or a 404. */
export async function findProduct(db: Queryable, id: string): Promise<Product> {
  const row = await db.query.products.findFirst({
    where: eq(products.id, id),
    columns: {
      id: true,
      name: true,
      slug: true,
      description: true,
      categoryId: true,
      status: true,
      price: true,
      compareAtPrice: true,
    },
    with: {
      options: {
        columns: { optionTypeId: true, position: true },
        with: { optionType: { columns: { name: true, kind: true } } },
        orderBy: [asc(productOptions.position)],
      },
      variants: {
        columns: { id: true, sku: true, price: true, stock: true, position: true },
        with: { optionValues: { columns: { optionValueId: true } } },
        orderBy: [asc(productVariants.position), asc(productVariants.createdAt)],
      },
      images: {
        columns: { id: true, storageKey: true, alt: true, position: true, optionValueId: true },
        orderBy: [asc(productImages.position), asc(productImages.createdAt)],
      },
    },
  });
  const product = orNotFound(row);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    status: product.status,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    options: product.options.map((option) => ({
      optionTypeId: option.optionTypeId,
      name: option.optionType.name,
      kind: option.optionType.kind,
      position: option.position,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      position: variant.position,
      optionValueIds: variant.optionValues.map((value) => value.optionValueId),
    })),
    images: product.images.map(({ storageKey, ...image }) => ({ ...image, key: storageKey })),
  };
}
