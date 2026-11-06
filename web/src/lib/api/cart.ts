import 'server-only';
import { cookies } from 'next/headers';
import {
  CART_TOKEN_HEADER,
  cartMutationSchema,
  cartSchema,
  type AddToCart,
  type Cart,
  type CartMutation,
} from '@repo/shared';
import { apiRequest } from './server';

/** The guest cart token. httpOnly: only the Next.js server ever reads it. */
export const CART_COOKIE = 'cart_token';
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

const EMPTY_CART: Cart = { lines: [], itemCount: 0, subtotal: 0 };

async function cartHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token ? { [CART_TOKEN_HEADER]: token } : {};
}

/** The visitor's cart: their account's when signed in, else the guest cart in the cookie. */
export async function getCart(): Promise<Cart> {
  return apiRequest('/api/v1/cart', cartSchema, { headers: await cartHeaders() });
}

/** The cart for the header badge; an empty cart if the API can't be reached. */
export async function getCartOrEmpty(): Promise<Cart> {
  try {
    return await getCart();
  } catch {
    return EMPTY_CART;
  }
}

/** Server Actions only: adding may hand back a new guest token, which is stored here. */
export async function addCartItem(input: AddToCart): Promise<CartMutation> {
  const result = await apiRequest('/api/v1/cart/items', cartMutationSchema, {
    method: 'POST',
    body: input,
    headers: await cartHeaders(),
  });
  if (result.token) {
    (await cookies()).set(CART_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }
  return result;
}

export async function setCartItemQuantity(variantId: string, quantity: number): Promise<Cart> {
  return apiRequest(`/api/v1/cart/items/${encodeURIComponent(variantId)}`, cartSchema, {
    method: 'PATCH',
    body: { quantity },
    headers: await cartHeaders(),
  });
}

export async function removeCartItem(variantId: string): Promise<Cart> {
  return apiRequest(`/api/v1/cart/items/${encodeURIComponent(variantId)}`, cartSchema, {
    method: 'DELETE',
    headers: await cartHeaders(),
  });
}

/**
 * Once a signed-in request has been made, the API has moved any guest cart to
 * the account, so the guest token is spent. Server Actions only.
 */
export async function forgetGuestCart(): Promise<void> {
  const jar = await cookies();
  if (jar.has(CART_COOKIE)) jar.delete(CART_COOKIE);
}
