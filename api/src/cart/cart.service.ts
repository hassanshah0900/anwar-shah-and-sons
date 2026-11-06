import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MAX_LINE_QUANTITY,
  type AddToCart,
  type Cart,
  type CartMutation,
  type UpdateCartLine,
} from '@repo/shared';
import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { InjectDatabase } from '../db/database.module.js';
import { found } from '../db/queries.js';
import { cartItems, carts, products, productVariants } from '../db/schema/index.js';
import { findCartLines, toLine } from './cart-line.js';

/** Who is shopping: a signed-in customer, a guest holding a cart token, or both. */
export type CartOwner = { userId?: string; token?: string };

type ResolvedCart = { cartId: string; token: string | null };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Carts for customers (by user id) and guests (by a random token whose hash is
 * stored). When a guest signs in, their guest cart joins their customer cart.
 */
@Injectable()
export class CartService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async get(owner: CartOwner): Promise<Cart> {
    const resolved = await this.resolve(owner, false);
    return this.view(resolved?.cartId ?? null);
  }

  async add(owner: CartOwner, input: AddToCart): Promise<CartMutation> {
    const [variant] = await this.db
      .select({ stock: productVariants.stock })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(productVariants.id, input.variantId), eq(products.status, 'active')));
    if (!variant) throw new NotFoundException('This product is no longer available');

    const { cartId, token } = (await this.resolve(owner, true))!;
    const [existing] = await this.db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(lineOf(cartId, input.variantId));
    const quantity = (existing?.quantity ?? 0) + input.quantity;
    assertQuantity(quantity, variant.stock);

    await this.db
      .insert(cartItems)
      .values({ cartId, variantId: input.variantId, quantity })
      .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.variantId], set: { quantity } });
    await this.touch(cartId);
    return { cart: await this.view(cartId), token };
  }

  /** Sets a line's quantity; 0 removes it. Lowering is always allowed, raising checks stock. */
  async update(owner: CartOwner, variantId: string, { quantity }: UpdateCartLine): Promise<Cart> {
    const resolved = await this.resolve(owner, false);
    const [item] = resolved
      ? await this.db
          .select({ quantity: cartItems.quantity, stock: productVariants.stock })
          .from(cartItems)
          .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
          .where(lineOf(resolved.cartId, variantId))
      : [];
    if (!resolved || !item) throw new NotFoundException('This item is not in your cart');

    const line = lineOf(resolved.cartId, variantId);
    if (quantity === 0) {
      found(
        await this.db.delete(cartItems).where(line).returning({ quantity: cartItems.quantity }),
      );
    } else {
      if (quantity > item.quantity) assertQuantity(quantity, item.stock);
      found(
        await this.db
          .update(cartItems)
          .set({ quantity })
          .where(line)
          .returning({ quantity: cartItems.quantity }),
      );
    }
    await this.touch(resolved.cartId);
    return this.view(resolved.cartId);
  }

  /** Removes a line. Removing one that isn't there is not an error. */
  async remove(owner: CartOwner, variantId: string): Promise<Cart> {
    const resolved = await this.resolve(owner, false);
    if (!resolved) return this.view(null);
    await this.db.delete(cartItems).where(lineOf(resolved.cartId, variantId));
    await this.touch(resolved.cartId);
    return this.view(resolved.cartId);
  }

  /**
   * Finds the owner's cart, creating one if asked. A new guest cart comes with
   * its token, returned only this once. A customer who still holds a guest
   * token gets the guest cart's items added to theirs.
   */
  private async resolve(owner: CartOwner, create: boolean): Promise<ResolvedCart | null> {
    const [guest] = owner.token
      ? await this.db
          .select({ id: carts.id })
          .from(carts)
          .where(eq(carts.tokenHash, hashToken(owner.token)))
      : [];

    if (owner.userId) {
      const userId = owner.userId;
      const [own] = await this.db
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.userId, userId));
      // Another request may have just given this guest cart to the customer, making them
      // the same cart. Never merge a cart into itself: that would delete it.
      if (guest && own && guest.id !== own.id) {
        await this.merge(guest.id, own.id);
      } else if (guest && !own) {
        // No customer cart yet: the guest cart simply becomes theirs, if nobody beat us to it.
        const claimed = await this.db
          .update(carts)
          .set({ userId, tokenHash: null, updatedAt: new Date() })
          .where(and(eq(carts.id, guest.id), isNotNull(carts.tokenHash)))
          .returning({ id: carts.id });
        if (claimed.length === 1) return { cartId: guest.id, token: null };
        return this.resolve({ userId }, create);
      }
      if (own) return { cartId: own.id, token: null };
      if (!create) return null;
      const cart = found(
        await this.db.insert(carts).values({ userId }).returning({ id: carts.id }),
      );
      return { cartId: cart.id, token: null };
    }

    if (guest) return { cartId: guest.id, token: null };
    if (!create) return null;
    const token = randomBytes(32).toString('base64url');
    const cart = found(
      await this.db
        .insert(carts)
        .values({ tokenHash: hashToken(token) })
        .returning({ id: carts.id }),
    );
    return { cartId: cart.id, token };
  }

  /**
   * Moves a guest cart's items into a customer cart, deleting the guest cart. A
   * page's requests often arrive together, so deleting comes first: the others wait
   * on it, then find nothing to delete and stop. Items only move once.
   */
  private async merge(fromId: string, intoId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const from = await tx.select().from(cartItems).where(eq(cartItems.cartId, fromId));
      const deleted = await tx
        .delete(carts)
        .where(eq(carts.id, fromId))
        .returning({ id: carts.id });
      if (deleted.length === 0) return;

      const into = await tx.select().from(cartItems).where(eq(cartItems.cartId, intoId));
      const held = new Map(into.map((item) => [item.variantId, item.quantity]));
      for (const item of from) {
        const quantity = Math.min(
          (held.get(item.variantId) ?? 0) + item.quantity,
          MAX_LINE_QUANTITY,
        );
        await tx
          .insert(cartItems)
          .values({ cartId: intoId, variantId: item.variantId, quantity })
          .onConflictDoUpdate({
            target: [cartItems.cartId, cartItems.variantId],
            set: { quantity },
          });
      }
    });
  }

  /**
   * Deletes guest carts (and their items) not changed since `cutoff`. Customer
   * carts are never removed. Safe to run more than once, or on several servers.
   */
  async deleteStaleGuestCarts(cutoff: Date): Promise<number> {
    const deleted = await this.db
      .delete(carts)
      .where(and(isNull(carts.userId), lt(carts.updatedAt, cutoff)))
      .returning({ id: carts.id });
    return deleted.length;
  }

  /** Records activity, so abandoned guest carts can be found and cleared later. */
  private async touch(cartId: string): Promise<void> {
    found(
      await this.db
        .update(carts)
        .set({ updatedAt: new Date() })
        .where(eq(carts.id, cartId))
        .returning({ id: carts.id }),
    );
  }

  private async view(cartId: string | null): Promise<Cart> {
    if (!cartId) return { lines: [], itemCount: 0, subtotal: 0 };

    const lines = (await findCartLines(this.db, cartId)).map(toLine);
    return {
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      // Only what can actually be bought counts towards the subtotal.
      subtotal: lines
        .filter((line) => line.available)
        .reduce((sum, line) => sum + line.lineTotal, 0),
    };
  }
}

/** The cart's line for this variant. */
function lineOf(cartId: string, variantId: string) {
  return and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId));
}

function assertQuantity(quantity: number, stock: number): void {
  if (quantity > MAX_LINE_QUANTITY) {
    throw new ConflictException(`You can buy up to ${MAX_LINE_QUANTITY} of an item`);
  }
  if (stock <= 0) throw new ConflictException('This item is out of stock');
  if (quantity > stock) throw new ConflictException('Not enough stock for that quantity');
}
