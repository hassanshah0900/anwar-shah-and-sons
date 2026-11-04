import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  orderStatusTransitions,
  shippingFor,
  type Checkout,
  type Order,
  type OrderList,
  type OrderListQuery,
  type OrderStatus,
} from '@repo/shared';
import { lineSelect, toLine } from '../cart/cart-line.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { storeConfig } from '../store/store-config.js';

const orderSelect = {
  number: true,
  status: true,
  paymentMethod: true,
  email: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  postalCode: true,
  notes: true,
  currency: true,
  subtotal: true,
  shipping: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      productName: true,
      variantLabel: true,
      sku: true,
      imageKey: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
      product: { select: { slug: true } },
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.OrderSelect;

const summarySelect = {
  number: true,
  status: true,
  email: true,
  fullName: true,
  total: true,
  createdAt: true,
  items: { select: { quantity: true } },
} satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
type SummaryRow = Prisma.OrderGetPayload<{ select: typeof summarySelect }>;

/** A customer placing or viewing their own orders. */
export type Customer = { id: string; email: string };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Turns the customer's cart into an order in one transaction: prices and
   * availability are checked, stock is taken (never below zero), and the cart
   * is emptied. Any failure leaves everything as it was.
   */
  async checkout(customer: Customer, input: Checkout): Promise<Order> {
    const store = storeConfig(this.config);

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.cartItem.findMany({
        where: { cart: { userId: customer.id } },
        select: { ...lineSelect, cartId: true },
        orderBy: { createdAt: 'asc' },
      });
      if (rows.length === 0) throw new BadRequestException('Your bag is empty');

      const lines = rows.map((row) => ({ row, line: toLine(row) }));
      for (const { line } of lines) {
        if (!line.available) {
          throw new ConflictException(
            `${line.name} is no longer available in that quantity. Please review your bag.`,
          );
        }
      }

      const subtotal = lines.reduce((sum, { line }) => sum + line.lineTotal, 0);
      const shipping = shippingFor(subtotal, store.shipping);
      if (subtotal + shipping !== input.expectedTotal) {
        throw new ConflictException('Prices have changed. Please review your bag.');
      }

      for (const { row, line } of lines) {
        // Conditional decrement: two shoppers can't both buy the last one.
        const { count } = await tx.productVariant.updateMany({
          where: { id: line.variantId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (count === 0) {
          throw new ConflictException(`${row.variant.product.name} has just sold out.`);
        }
      }

      const order = await tx.order.create({
        data: {
          userId: customer.id,
          email: customer.email,
          paymentMethod: input.paymentMethod,
          currency: store.currency,
          subtotal,
          shipping,
          total: subtotal + shipping,
          fullName: input.address.fullName,
          phone: input.address.phone,
          line1: input.address.line1,
          line2: input.address.line2,
          city: input.address.city,
          postalCode: input.address.postalCode,
          notes: input.notes,
          items: {
            create: lines.map(({ row, line }) => ({
              variantId: line.variantId,
              productId: line.productId,
              productName: line.name,
              variantLabel: line.options
                .map((option) => `${option.name}: ${option.value}`)
                .join(' · '),
              sku: row.variant.sku,
              imageKey: line.image?.key ?? null,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
            })),
          },
        },
        select: orderSelect,
      });

      await tx.cartItem.deleteMany({ where: { cartId: rows[0]!.cartId } });
      return toOrder(order);
    });
  }

  /** A customer's own orders, newest first. */
  async listMine(customerId: string, query: OrderListQuery): Promise<OrderList> {
    return this.list({ userId: customerId, status: query.status }, query);
  }

  /** One of the customer's orders; someone else's is reported as not found. */
  async findMine(customerId: string, number: number): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { number, userId: customerId },
      select: orderSelect,
    });
    if (!order) throw new NotFoundException('Order not found');
    return toOrder(order);
  }

  /** Every order, newest first (admin). */
  listAll(query: OrderListQuery): Promise<OrderList> {
    return this.list({ status: query.status }, query);
  }

  async findAny(number: number): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { number }, select: orderSelect });
    if (!order) throw new NotFoundException('Order not found');
    return toOrder(order);
  }

  /**
   * Moves an order along (see orderStatusTransitions). Cancelling puts the
   * items back in stock. The status is re-checked in the update itself, so two
   * admins acting at once can't cancel (and restock) the same order twice.
   */
  async updateStatus(number: number, status: OrderStatus): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { number },
        select: { id: true, status: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === status) return toOrder(await this.select(tx, order.id));
      if (!orderStatusTransitions[order.status].includes(status)) {
        throw new ConflictException(`A ${order.status} order can't be marked ${status}`);
      }

      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status },
      });
      if (count === 0) throw new ConflictException('The order was just changed. Please reload.');

      if (status === 'cancelled') {
        const items = await tx.orderItem.findMany({
          where: { orderId: order.id, variantId: { not: null } },
          select: { variantId: true, quantity: true },
        });
        for (const item of items) {
          await tx.productVariant.update({
            where: { id: item.variantId! },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return toOrder(await this.select(tx, order.id));
    });
  }

  private select(tx: Prisma.TransactionClient, id: string): Promise<OrderRow> {
    return tx.order.findUniqueOrThrow({ where: { id }, select: orderSelect });
  }

  private async list(where: Prisma.OrderWhereInput, query: OrderListQuery): Promise<OrderList> {
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: summarySelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { orders: rows.map(toSummary), total };
  }
}

function toOrder(row: OrderRow): Order {
  return {
    number: row.number,
    status: row.status,
    paymentMethod: row.paymentMethod,
    email: row.email,
    address: {
      fullName: row.fullName,
      phone: row.phone,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      postalCode: row.postalCode,
    },
    notes: row.notes,
    currency: row.currency,
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    items: row.items.map(({ product, ...item }) => ({
      ...item,
      productSlug: product?.slug ?? null,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: SummaryRow) {
  return {
    number: row.number,
    status: row.status,
    email: row.email,
    customerName: row.fullName,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    total: row.total,
    createdAt: row.createdAt.toISOString(),
  };
}
