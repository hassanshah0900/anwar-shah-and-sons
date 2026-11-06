import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MAX_LINE_QUANTITY,
  type AddToCart,
  type Cart,
  type CartMutation,
  type UpdateCartLine,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { lineSelect, toLine } from './cart-line.js';

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
  constructor(private readonly prisma: PrismaService) {}

  async get(owner: CartOwner): Promise<Cart> {
    const resolved = await this.resolve(owner, false);
    return this.view(resolved?.cartId ?? null);
  }

  async add(owner: CartOwner, input: AddToCart): Promise<CartMutation> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: input.variantId, product: { status: 'active' } },
      select: { stock: true },
    });
    if (!variant) throw new NotFoundException('This product is no longer available');

    const { cartId, token } = (await this.resolve(owner, true))!;
    const key = { cartId_variantId: { cartId, variantId: input.variantId } };
    const existing = await this.prisma.cartItem.findUnique({
      where: key,
      select: { quantity: true },
    });
    const quantity = (existing?.quantity ?? 0) + input.quantity;
    assertQuantity(quantity, variant.stock);

    await this.prisma.cartItem.upsert({
      where: key,
      create: { cartId, variantId: input.variantId, quantity },
      update: { quantity },
    });
    await this.touch(cartId);
    return { cart: await this.view(cartId), token };
  }

  /** Sets a line's quantity; 0 removes it. Lowering is always allowed, raising checks stock. */
  async update(owner: CartOwner, variantId: string, { quantity }: UpdateCartLine): Promise<Cart> {
    const resolved = await this.resolve(owner, false);
    const item =
      resolved &&
      (await this.prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: resolved.cartId, variantId } },
        select: { quantity: true, variant: { select: { stock: true } } },
      }));
    if (!resolved || !item) throw new NotFoundException('This item is not in your cart');

    const key = { cartId_variantId: { cartId: resolved.cartId, variantId } };
    if (quantity === 0) {
      await this.prisma.cartItem.delete({ where: key });
    } else {
      if (quantity > item.quantity) assertQuantity(quantity, item.variant.stock);
      await this.prisma.cartItem.update({ where: key, data: { quantity } });
    }
    await this.touch(resolved.cartId);
    return this.view(resolved.cartId);
  }

  /** Removes a line. Removing one that isn't there is not an error. */
  async remove(owner: CartOwner, variantId: string): Promise<Cart> {
    const resolved = await this.resolve(owner, false);
    if (!resolved) return this.view(null);
    await this.prisma.cartItem.deleteMany({ where: { cartId: resolved.cartId, variantId } });
    await this.touch(resolved.cartId);
    return this.view(resolved.cartId);
  }

  /**
   * Finds the owner's cart, creating one if asked. A new guest cart comes with
   * its token, returned only this once. A customer who still holds a guest
   * token gets the guest cart's items added to theirs.
   */
  private async resolve(owner: CartOwner, create: boolean): Promise<ResolvedCart | null> {
    const guest = owner.token
      ? await this.prisma.cart.findUnique({
          where: { tokenHash: hashToken(owner.token) },
          select: { id: true },
        })
      : null;

    if (owner.userId) {
      const userId = owner.userId;
      const own = await this.prisma.cart.findUnique({ where: { userId }, select: { id: true } });
      // Another request may have just given this guest cart to the customer, making them
      // the same cart. Never merge a cart into itself: that would delete it.
      if (guest && own && guest.id !== own.id) {
        await this.merge(guest.id, own.id);
      } else if (guest && !own) {
        // No customer cart yet: the guest cart simply becomes theirs, if nobody beat us to it.
        const { count } = await this.prisma.cart.updateMany({
          where: { id: guest.id, tokenHash: { not: null } },
          data: { userId, tokenHash: null },
        });
        if (count === 1) return { cartId: guest.id, token: null };
        return this.resolve({ userId }, create);
      }
      if (own) return { cartId: own.id, token: null };
      if (!create) return null;
      const cart = await this.prisma.cart.create({ data: { userId }, select: { id: true } });
      return { cartId: cart.id, token: null };
    }

    if (guest) return { cartId: guest.id, token: null };
    if (!create) return null;
    const token = randomBytes(32).toString('base64url');
    const cart = await this.prisma.cart.create({
      data: { tokenHash: hashToken(token) },
      select: { id: true },
    });
    return { cartId: cart.id, token };
  }

  /**
   * Moves a guest cart's items into a customer cart, deleting the guest cart. A
   * page's requests often arrive together, so deleting comes first: the others wait
   * on it, then find nothing to delete and stop. Items only move once.
   */
  private async merge(fromId: string, intoId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const from = await tx.cartItem.findMany({ where: { cartId: fromId } });
      const { count } = await tx.cart.deleteMany({ where: { id: fromId } });
      if (count === 0) return;

      const into = await tx.cartItem.findMany({ where: { cartId: intoId } });
      const held = new Map(into.map((item) => [item.variantId, item.quantity]));
      for (const item of from) {
        const quantity = Math.min(
          (held.get(item.variantId) ?? 0) + item.quantity,
          MAX_LINE_QUANTITY,
        );
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: intoId, variantId: item.variantId } },
          create: { cartId: intoId, variantId: item.variantId, quantity },
          update: { quantity },
        });
      }
    });
  }

  /**
   * Deletes guest carts (and their items) not changed since `cutoff`. Customer
   * carts are never removed. Safe to run more than once, or on several servers.
   */
  async deleteStaleGuestCarts(cutoff: Date): Promise<number> {
    const { count } = await this.prisma.cart.deleteMany({
      where: { userId: null, updatedAt: { lt: cutoff } },
    });
    return count;
  }

  /** Records activity, so abandoned guest carts can be found and cleared later. */
  private async touch(cartId: string): Promise<void> {
    await this.prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  }

  private async view(cartId: string | null): Promise<Cart> {
    if (!cartId) return { lines: [], itemCount: 0, subtotal: 0 };

    const rows = await this.prisma.cartItem.findMany({
      where: { cartId },
      select: lineSelect,
      orderBy: { createdAt: 'asc' },
    });
    const lines = rows.map(toLine);
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

function assertQuantity(quantity: number, stock: number): void {
  if (quantity > MAX_LINE_QUANTITY) {
    throw new ConflictException(`You can buy up to ${MAX_LINE_QUANTITY} of an item`);
  }
  if (stock <= 0) throw new ConflictException('This item is out of stock');
  if (quantity > stock) throw new ConflictException('Not enough stock for that quantity');
}
