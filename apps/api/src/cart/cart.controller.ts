import { Body, Controller, Delete, Get, Header, Headers, Param, Patch, Post } from '@nestjs/common';
import {
  addToCartSchema,
  CART_TOKEN_HEADER,
  updateCartLineSchema,
  type AddToCart,
  type Cart,
  type CartMutation,
  type UpdateCartLine,
} from '@repo/shared';
import { OptionalAuth, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CartService, type CartOwner } from './cart.service.js';

/** Carts differ per visitor and change often: never cache them. */
const NO_STORE = 'private, no-store';

/**
 * The visitor's cart. Works signed in (by session) or as a guest (by the
 * cart token header); a guest's first add creates the cart and its token.
 */
@OptionalAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @Header('Cache-Control', NO_STORE)
  get(
    @Session() session: UserSession<Auth> | null,
    @Headers(CART_TOKEN_HEADER) token?: string,
  ): Promise<Cart> {
    return this.cart.get(owner(session, token));
  }

  @Post('items')
  @Header('Cache-Control', NO_STORE)
  add(
    @Session() session: UserSession<Auth> | null,
    @Body(new ZodValidationPipe(addToCartSchema)) body: AddToCart,
    @Headers(CART_TOKEN_HEADER) token?: string,
  ): Promise<CartMutation> {
    return this.cart.add(owner(session, token), body);
  }

  @Patch('items/:variantId')
  @Header('Cache-Control', NO_STORE)
  update(
    @Session() session: UserSession<Auth> | null,
    @Param('variantId') variantId: string,
    @Body(new ZodValidationPipe(updateCartLineSchema)) body: UpdateCartLine,
    @Headers(CART_TOKEN_HEADER) token?: string,
  ): Promise<Cart> {
    return this.cart.update(owner(session, token), variantId, body);
  }

  @Delete('items/:variantId')
  @Header('Cache-Control', NO_STORE)
  remove(
    @Session() session: UserSession<Auth> | null,
    @Param('variantId') variantId: string,
    @Headers(CART_TOKEN_HEADER) token?: string,
  ): Promise<Cart> {
    return this.cart.remove(owner(session, token), variantId);
  }
}

function owner(session: UserSession<Auth> | null, token: string | undefined): CartOwner {
  return { userId: session?.user.id, token: token || undefined };
}
