import { z } from 'zod';
import { stockLevelSchema } from './storefront.js';

/**
 * Cart contracts. Prices are always the live variant price; the cart stores
 * only what was chosen and how many.
 */

/** The most of one variant a cart may hold. */
export const MAX_LINE_QUANTITY = 10;

/**
 * Guests are identified by a random token the web app keeps in a cookie and
 * sends in this header. Signed-in customers are identified by their session.
 */
export const CART_TOKEN_HEADER = 'x-cart-token';

const idSchema = z.string().min(1);
const moneySchema = z.number().int().nonnegative();

export const cartLineSchema = z.object({
  variantId: idSchema,
  productId: idSchema,
  name: z.string(),
  slug: z.string(),
  image: z.object({ key: z.string(), alt: z.string() }).nullable(),
  /** The variant's choices in display order, e.g. Colour: Black, Size: M. */
  options: z.array(z.object({ name: z.string(), value: z.string() })),
  unitPrice: moneySchema,
  quantity: z.number().int().positive(),
  lineTotal: moneySchema,
  stockLevel: stockLevelSchema,
  /** False when the product was unpublished or stock fell below the quantity. */
  available: z.boolean(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const cartSchema = z.object({
  lines: z.array(cartLineSchema),
  /** Total units, for the header badge. */
  itemCount: z.number().int().nonnegative(),
  subtotal: moneySchema,
});
export type Cart = z.infer<typeof cartSchema>;

/** Adding may create a guest cart; its token is returned once, to be stored by the client. */
export const cartMutationSchema = z.object({
  cart: cartSchema,
  token: z.string().nullable(),
});
export type CartMutation = z.infer<typeof cartMutationSchema>;

const quantity = (min: number) =>
  z
    .number({ error: 'Enter a quantity' })
    .int('Enter a whole number')
    .min(min, `The quantity must be at least ${min}`)
    .max(MAX_LINE_QUANTITY, `You can buy up to ${MAX_LINE_QUANTITY} of an item`);

export const addToCartSchema = z.object({
  variantId: idSchema,
  quantity: quantity(1).default(1),
});
export type AddToCart = z.infer<typeof addToCartSchema>;

/** Setting the quantity to 0 removes the line. */
export const updateCartLineSchema = z.object({ quantity: quantity(0) });
export type UpdateCartLine = z.infer<typeof updateCartLineSchema>;
