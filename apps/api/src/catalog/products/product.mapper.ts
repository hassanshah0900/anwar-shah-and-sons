import type { Product } from '@repo/shared';
import type { Prisma } from '../../generated/prisma/client.js';

export const productSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  categoryId: true,
  status: true,
  price: true,
  compareAtPrice: true,
  options: {
    select: {
      optionTypeId: true,
      position: true,
      optionType: { select: { name: true, kind: true } },
    },
    orderBy: { position: 'asc' },
  },
  variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      stock: true,
      position: true,
      optionValues: { select: { optionValueId: true } },
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    categoryId: row.categoryId,
    status: row.status,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    options: row.options.map((option) => ({
      optionTypeId: option.optionTypeId,
      name: option.optionType.name,
      kind: option.optionType.kind,
      position: option.position,
    })),
    variants: row.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      position: variant.position,
      optionValueIds: variant.optionValues.map((value) => value.optionValueId),
    })),
  };
}
