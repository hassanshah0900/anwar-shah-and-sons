'use server';

import { refresh } from 'next/cache';
import { addToCartSchema, updateCartLineSchema, type Cart } from '@repo/shared';
import { addCartItem, forgetGuestCart, removeCartItem, setCartItemQuantity } from '@/lib/api/cart';
import { ApiError } from '@/lib/api/server';
import { getSessionUser } from '@/lib/auth/session';

export type CartActionResult = { ok: true; itemCount: number } | { ok: false; message: string };

const variantIdOf = (value: unknown) => (typeof value === 'string' ? value : '');

/** Runs a cart change, refreshes the page (and header badge) and reports the outcome. */
async function run(change: () => Promise<Cart>): Promise<CartActionResult> {
  try {
    const cart = await change();
    // Signed in: the API has moved any guest cart to the account, so drop its token.
    if (await getSessionUser()) await forgetGuestCart();
    refresh();
    return { ok: true, itemCount: cart.itemCount };
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      return { ok: false, message: error.issues[0]?.message ?? error.message };
    }
    console.error('Cart update failed', error);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}

export async function addToCart(variantId: unknown, quantity: unknown = 1) {
  const parsed = addToCartSchema.safeParse({ variantId: variantIdOf(variantId), quantity });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message } as const;
  return run(async () => (await addCartItem(parsed.data)).cart);
}

export async function updateCartQuantity(variantId: unknown, quantity: unknown) {
  const parsed = updateCartLineSchema.safeParse({ quantity });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message } as const;
  return run(() => setCartItemQuantity(variantIdOf(variantId), parsed.data.quantity));
}

export async function removeFromCart(variantId: unknown) {
  return run(() => removeCartItem(variantIdOf(variantId)));
}
