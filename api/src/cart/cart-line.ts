import { stockLevel, type CartLine } from '@repo/shared';
import { asc, eq } from 'drizzle-orm';
import type { Queryable } from '../db/queries.js';
import { cartItems, productImages, productOptions } from '../db/schema/index.js';

/**
 * A cart's lines, oldest first, with what's needed to show them (and, at checkout, to
 * turn them into order lines).
 */
export function findCartLines(db: Queryable, cartId: string) {
  return db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cartId),
    columns: { quantity: true },
    orderBy: [asc(cartItems.createdAt)],
    with: {
      variant: {
        columns: { id: true, sku: true, price: true, stock: true },
        with: {
          product: {
            columns: { id: true, name: true, slug: true, price: true, status: true },
            with: {
              options: {
                columns: { optionTypeId: true },
                orderBy: [asc(productOptions.position)],
              },
              images: {
                columns: { storageKey: true, alt: true, optionValueId: true },
                orderBy: [asc(productImages.position), asc(productImages.createdAt)],
              },
            },
          },
          optionValues: {
            columns: {},
            with: {
              optionValue: {
                columns: { id: true, label: true, optionTypeId: true },
                with: { optionType: { columns: { name: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export type LineRow = Awaited<ReturnType<typeof findCartLines>>[number];

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
