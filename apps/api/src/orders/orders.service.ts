import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isAwaitingPayment,
  orderStatusTransitions,
  shippingFor,
  type Checkout,
  type CheckoutResult,
  type Order,
  type OrderList,
  type OrderListQuery,
  type OrderStatus,
  type PaymentLink,
} from '@repo/shared';
import { AddressesService } from '../addresses/addresses.service.js';
import { lineSelect, toLine } from '../cart/cart-line.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { Mailer } from '../mail/mailer.js';
import { orderCancelledEmail, orderPlacedEmail, orderShippedEmail } from '../mail/templates.js';
import { PaymentGateway } from '../payments/payment-gateway.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { storeConfig } from '../store/store-config.js';

const orderSelect = {
  id: true,
  number: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  stripeSessionId: true,
  stripePaymentIntentId: true,
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
  paymentMethod: true,
  paymentStatus: true,
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

/** Statuses the customer is emailed about, besides the order being placed. */
const MINUTE_MS = 60_000;
/** How many overdue orders one run of the payments job looks at. */
const OVERDUE_BATCH = 50;

const notifiedStatuses = {
  shipped: orderShippedEmail,
  cancelled: orderCancelledEmail,
} satisfies Partial<Record<OrderStatus, unknown>>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly mailer: Mailer,
    private readonly addresses: AddressesService,
    private readonly gateway: PaymentGateway,
  ) {}

  /**
   * Turns the customer's cart into an order in one transaction: prices and
   * availability are checked, stock is taken (never below zero), and the cart
   * is emptied. Any failure leaves everything as it was.
   *
   * A card order then waits for its payment, holding the stock. Its cart is kept
   * until the payment page exists, so a failure there costs the customer nothing.
   */
  async checkout(customer: Customer, input: Checkout): Promise<CheckoutResult> {
    const store = storeConfig(this.config);
    if (!store.paymentMethods.includes(input.paymentMethod)) {
      throw new BadRequestException('That payment method is not available');
    }

    const { order, variantIds } = await this.prisma.$transaction(async (tx) => {
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

      if (input.paymentMethod === 'cod') {
        await tx.cartItem.deleteMany({ where: { cartId: rows[0]!.cartId } });
      }
      return { order: toOrder(order), variantIds: lines.map(({ line }) => line.variantId) };
    });

    const paymentUrl =
      input.paymentMethod === 'card' ? await this.startPayment(customer, order, variantIds) : null;

    // Only once the order is committed; neither of these can undo it.
    // A card order's email waits for the payment.
    if (input.paymentMethod === 'cod') this.notify(order, orderPlacedEmail);
    if (input.saveAddress) {
      await this.addresses
        .saveFromCheckout(customer.id, input.address)
        .catch((error: unknown) =>
          this.logger.error(`Saving the address from order #${order.number} failed`, error),
        );
    }
    return { ...order, paymentUrl };
  }

  /** A customer's own orders, newest first. */
  async listMine(customerId: string, query: OrderListQuery): Promise<OrderList> {
    return this.list({ userId: customerId, status: query.status }, query);
  }

  /**
   * One of the customer's orders; someone else's is reported as not found. An
   * unpaid one is checked with Stripe first, so a customer coming back from
   * paying sees it paid even if the webhook hasn't arrived yet.
   */
  async findMine(customerId: string, number: number): Promise<Order> {
    const where = { number, userId: customerId };
    const order = await this.prisma.order.findFirst({ where, select: orderSelect });
    if (!order) throw new NotFoundException('Order not found');
    if (!isAwaitingPayment(order) || !order.stripeSessionId) return toOrder(order);

    try {
      await this.syncPayment(order.stripeSessionId);
    } catch (error) {
      this.logger.error(`Checking the payment of order #${number} failed`, error);
      return toOrder(order);
    }
    return toOrder(await this.prisma.order.findFirstOrThrow({ where, select: orderSelect }));
  }

  /** The page where the customer can finish paying, while there's still time. */
  async resumePayment(customerId: string, number: number): Promise<PaymentLink> {
    const order = await this.prisma.order.findFirst({
      where: { number, userId: customerId },
      select: orderSelect,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!isAwaitingPayment(order) || !order.stripeSessionId) {
      throw new ConflictException('This order is not waiting for a payment.');
    }

    const session = await this.gateway.getSession(order.stripeSessionId);
    if (session.status === 'open' && session.url) return { url: session.url };
    await this.syncPayment(session.id);
    throw new ConflictException('This payment has already been completed or has expired.');
  }

  /**
   * Brings an order in line with its payment session. Stripe is asked rather
   * than the webhook believed, so repeated or out-of-order calls are harmless.
   */
  async syncPayment(sessionId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      select: { id: true, number: true, status: true, paymentMethod: true, paymentStatus: true },
    });
    if (!order) {
      this.logger.warn(`Payment session ${sessionId} doesn't belong to an order`);
      return;
    }
    if (order.paymentStatus !== 'unpaid') return;

    const session = await this.gateway.getSession(sessionId);
    if (session.paid) {
      await this.markPaid(order.id, session.paymentIntentId);
    } else if (session.status === 'expired' && order.status === 'pending') {
      await this.updateStatus(order.number, 'cancelled', { expireSession: false });
    }
  }

  /**
   * Settles unpaid card orders older than `before`, whose sessions should have
   * ended. Returns how many it looked at; one failing doesn't stop the others.
   */
  async settleOverdue(before: Date): Promise<number> {
    const orders = await this.prisma.order.findMany({
      where: {
        paymentMethod: 'card',
        paymentStatus: 'unpaid',
        status: 'pending',
        createdAt: { lt: before },
      },
      select: { number: true, stripeSessionId: true },
      orderBy: { createdAt: 'asc' },
      take: OVERDUE_BATCH,
    });

    for (const { number, stripeSessionId } of orders) {
      try {
        // No session means the API stopped while starting the payment.
        if (stripeSessionId) await this.syncPayment(stripeSessionId);
        else await this.updateStatus(number, 'cancelled', { notify: false });
      } catch (error) {
        this.logger.error(`Settling the payment of order #${number} failed`, error);
      }
    }
    return orders.length;
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
   *
   * Cancelling a card order also refunds it, or closes its payment page if it
   * hasn't been paid. Delivering a cash order means the cash has been collected.
   */
  async updateStatus(
    number: number,
    status: OrderStatus,
    { notify = true, expireSession = true }: { notify?: boolean; expireSession?: boolean } = {},
  ): Promise<Order> {
    const { order, changed } = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { number },
        select: { id: true, status: true, paymentMethod: true, paymentStatus: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === status) {
        return { order: toOrder(await this.select(tx, order.id)), changed: false };
      }
      if (!orderStatusTransitions[order.status].includes(status)) {
        throw new ConflictException(`A ${order.status} order can't be marked ${status}`);
      }
      if (status === 'confirmed' && isAwaitingPayment(order)) {
        throw new ConflictException("This order hasn't been paid yet.");
      }

      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status, ...(status === 'delivered' ? { paymentStatus: 'paid' as const } : {}) },
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
      return { order: toOrder(await this.select(tx, order.id)), changed: true };
    });

    const result =
      changed && status === 'cancelled' ? await this.closePayment(order, expireSession) : order;
    if (notify && changed && status in notifiedStatuses) {
      this.notify(result, notifiedStatuses[status as keyof typeof notifiedStatuses]);
    }
    return result;
  }

  /** Creates the payment page for a new card order, then empties the customer's cart. */
  private async startPayment(
    customer: Customer,
    order: Order,
    variantIds: string[],
  ): Promise<string> {
    const webUrl = this.config.get('BETTER_AUTH_URL', { infer: true });
    const orderUrl = new URL(`/account/orders/${order.number}`, webUrl);
    const windowMinutes = this.config.get('PAYMENT_WINDOW_MINUTES', { infer: true });

    let session;
    try {
      session = await this.gateway.createSession({
        idempotencyKey: `order-${order.number}-${order.createdAt}`,
        orderNumber: order.number,
        email: customer.email,
        currency: order.currency,
        lines: [
          ...order.items.map((item) => ({
            name: item.productName,
            description: item.variantLabel,
            unitAmount: item.unitPrice,
            quantity: item.quantity,
          })),
          ...(order.shipping > 0
            ? [{ name: 'Shipping', unitAmount: order.shipping, quantity: 1 }]
            : []),
        ],
        successUrl: `${orderUrl.href}?paid=1`,
        cancelUrl: orderUrl.href,
        expiresAt: new Date(Date.now() + windowMinutes * MINUTE_MS),
      });
      if (!session.url) throw new Error('Stripe returned a session without a URL');
    } catch (error) {
      this.logger.error(`Starting the payment of order #${order.number} failed`, error);
      await this.updateStatus(order.number, 'cancelled', { notify: false });
      throw new ServiceUnavailableException(
        "We couldn't start the payment and you haven't been charged. Please try again.",
      );
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { number: order.number },
        data: { stripeSessionId: session.id },
      }),
      this.prisma.cartItem.deleteMany({
        where: { cart: { userId: customer.id }, variantId: { in: variantIds } },
      }),
    ]);
    return session.url;
  }

  /**
   * Records a payment. Conditional updates mean only the first call does anything,
   * and a cancellation at the same moment isn't undone. A payment that arrives
   * after the order was cancelled goes straight back to the customer.
   */
  private async markPaid(id: string, paymentIntentId: string | null): Promise<void> {
    const order = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, paymentStatus: 'unpaid' },
        data: { paymentStatus: 'paid', stripePaymentIntentId: paymentIntentId },
      });
      if (count === 0) return null;
      await tx.order.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'confirmed' },
      });
      return this.select(tx, id);
    });
    if (!order) return;

    if (order.status === 'cancelled') {
      this.logger.warn(`Order #${order.number} was paid after being cancelled; refunding`);
      await this.refund(order);
    } else {
      this.notify(toOrder(order), orderPlacedEmail);
    }
  }

  /** Settles a card order that was just cancelled. Stripe failing doesn't undo the cancel. */
  private async closePayment(order: Order, expireSession: boolean): Promise<Order> {
    if (order.paymentMethod !== 'card') return order;

    const row = await this.prisma.order.findUniqueOrThrow({
      where: { number: order.number },
      select: orderSelect,
    });
    if (row.paymentStatus === 'paid') {
      return (await this.refund(row)) ? { ...order, paymentStatus: 'refunded' } : order;
    }
    if (expireSession && row.stripeSessionId) {
      // If it's paid regardless, the webhook refunds it (see markPaid).
      await this.gateway
        .expireSession(row.stripeSessionId)
        .catch((error: unknown) =>
          this.logger.warn(
            `Closing the payment of order #${order.number} failed: ${String(error)}`,
          ),
        );
    }
    return order;
  }

  /** Returns whether the money went back. On failure, the order stays marked paid. */
  private async refund(order: OrderRow): Promise<boolean> {
    try {
      if (!order.stripePaymentIntentId) throw new Error('The order has no payment intent');
      await this.gateway.refund(order.stripePaymentIntentId, `refund-${order.id}`);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'refunded' },
      });
      return true;
    } catch (error) {
      this.logger.error(`Refunding order #${order.number} failed`, error);
      return false;
    }
  }

  /** Emails the customer in the background; failures are logged, not raised. */
  private notify(
    order: Order,
    template: (context: { order: Order; locale: string; orderUrl: string }) => {
      subject: string;
      text: string;
      html: string;
    },
  ): void {
    const webUrl = this.config.get('BETTER_AUTH_URL', { infer: true });
    const email = template({
      order,
      locale: this.config.get('STORE_LOCALE', { infer: true }),
      orderUrl: new URL(`/account/orders/${order.number}`, webUrl).toString(),
    });
    this.mailer
      .send({ to: order.email, ...email })
      .catch((error: unknown) =>
        this.logger.error(`Email for order #${order.number} failed`, error),
      );
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
    paymentStatus: row.paymentStatus,
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
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    email: row.email,
    customerName: row.fullName,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    total: row.total,
    createdAt: row.createdAt.toISOString(),
  };
}
