import { stockLevel, type CartLine } from '@repo/shared';
import type { Prisma } from '../generated/prisma/client.js';

/** What's needed to show a cart line (and, at checkout, to turn it into an order line). */
export const lineSelect = {
  quantity: true,
  variant: {
    select: {
      id: true,
      sku: true,
      price: true,
      stock: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          status: true,
          options: { select: { optionTypeId: true }, orderBy: { position: 'asc' } },
          images: {
            select: { storageKey: true, alt: true, optionValueId: true },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          },
        },
      },
      optionValues: {
        select: {
          optionValue: {
            select: {
              id: true,
              label: true,
              optionTypeId: true,
              optionType: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartItemSelect;

export type LineRow = Prisma.CartItemGetPayload<{ select: typeof lineSelect }>;

/** A cart line as shown to the shopper, with live price and availability. */
export function toLine({ quantity, variant }: LineRow): CartLine {
  const { product } = variant;
  const typeOrder = product.options.map((option) => option.optionTypeId);
  const values = variant.optionValues
    .map(({ optionValue }) => optionValue)
    .sort((a, b) => typeOrder.indexOf(a.optionTypeId) - typeOrder.indexOf(b.optionTypeId));
  const valueIds = new Set(values.map((value) => value.id));
  // Prefer a photo of this variant (e.g. its colour), else the product's first.
  const image =
    product.images.find(
      (candidate) => candidate.optionValueId && valueIds.has(candidate.optionValueId),
    ) ?? product.images[0];
  const unitPrice = variant.price ?? product.price;

  return {
    variantId: variant.id,
    productId: product.id,
    name: product.name,
    slug: product.slug,
    image: image ? { key: image.storageKey, alt: image.alt } : null,
    options: values.map((value) => ({ name: value.optionType.name, value: value.label })),
    unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
    stockLevel: stockLevel(variant.stock),
    available: product.status === 'active' && variant.stock >= quantity,
  };
}
