import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql, sum, type SQL } from 'drizzle-orm';
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
  canCustomerCancel,
  isAwaitingPayment,
  isRefundDue,
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
import { findCartLines, toLine } from '../cart/cart-line.js';
import type { Env } from '../config/env.js';
import type { Database } from '../db/connection.js';
import { InjectDatabase } from '../db/database.module.js';
import { found, orNotFound, touch, type Queryable } from '../db/queries.js';
import { cartItems, carts, orderItems, orders, productVariants } from '../db/schema/index.js';
import { Mailer } from '../mail/mailer.js';
import {
  orderCancelledEmail,
  orderPlacedEmail,
  orderRefundedEmail,
  orderShippedEmail,
} from '../mail/templates.js';
import { PaymentGateway } from '../payments/payment-gateway.js';
import { storeConfig } from '../store/store-config.js';

/** An order with its lines, or undefined. */
function findOrder(db: Queryable, where: SQL) {
  return db.query.orders.findFirst({
    where,
    with: {
      items: {
        columns: {
          productName: true,
          variantLabel: true,
          sku: true,
          imageKey: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
        },
        with: { product: { columns: { slug: true } } },
        orderBy: [asc(orderItems.id)],
      },
    },
  });
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof findOrder>>>;

/** A customer placing or viewing their own orders. */
export type Customer = { id: string; email: string };

/** Statuses the customer is emailed about, besides the order being placed. */
const MINUTE_MS = 60_000;
/** Cancelled orders whose refund failed (see isRefundDue). */
const refundDueWhere = and(
  eq(orders.paymentMethod, 'card'),
  eq(orders.paymentStatus, 'paid'),
  eq(orders.status, 'cancelled'),
);
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
    @InjectDatabase() private readonly db: Database,
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

    const { order, variantIds } = await this.db.transaction(async (tx) => {
      const [cart] = await tx
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.userId, customer.id));
      const rows = cart ? await findCartLines(tx, cart.id) : [];
      if (!cart || rows.length === 0) throw new BadRequestException('Your bag is empty');

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
        const taken = await tx
          .update(productVariants)
          .set(touch({ stock: sql`${productVariants.stock} - ${line.quantity}` }))
          .where(
            and(eq(productVariants.id, line.variantId), gte(productVariants.stock, line.quantity)),
          )
          .returning({ id: productVariants.id });
        if (taken.length === 0) {
          throw new ConflictException(`${row.variant.product.name} has just sold out.`);
        }
      }

      const { id: orderId } = found(
        await tx
          .insert(orders)
          .values({
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
          })
          .returning({ id: orders.id }),
      );
      await tx.insert(orderItems).values(
        lines.map(({ row, line }) => ({
          orderId,
          variantId: line.variantId,
          productId: line.productId,
          productName: line.name,
          variantLabel: line.options.map((option) => `${option.name}: ${option.value}`).join(' · '),
          sku: row.variant.sku,
          imageKey: line.image?.key ?? null,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
      );

      if (input.paymentMethod === 'cod') {
        await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      }
      return {
        order: toOrder(orNotFound(await findOrder(tx, eq(orders.id, orderId)))),
        variantIds: lines.map(({ line }) => line.variantId),
      };
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
    return this.list(
      and(
        eq(orders.userId, customerId),
        query.status ? eq(orders.status, query.status) : undefined,
      ),
      query,
    );
  }

  /**
   * One of the customer's orders; someone else's is reported as not found. An
   * unpaid one is checked with Stripe first, so a customer coming back from
   * paying sees it paid even if the webhook hasn't arrived yet.
   */
  async findMine(customerId: string, number: number): Promise<Order> {
    const where = and(eq(orders.number, number), eq(orders.userId, customerId))!;
    const order = await findOrder(this.db, where);
    if (!order) throw new NotFoundException('Order not found');
    if (!isAwaitingPayment(order) || !order.stripeSessionId) return toOrder(order);

    try {
      await this.syncPayment(order.stripeSessionId);
    } catch (error) {
      this.logger.error(`Checking the payment of order #${number} failed`, error);
      return toOrder(order);
    }
    return toOrder(orNotFound(await findOrder(this.db, where)));
  }

  /**
   * Cancels the customer's own order, as an admin would: it's restocked, and
   * refunded if paid. Cancelling it again changes nothing.
   */
  async cancelMine(customerId: string, number: number): Promise<Order> {
    const [order] = await this.db
      .select({ status: orders.status })
      .from(orders)
      .where(and(eq(orders.number, number), eq(orders.userId, customerId)));
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'cancelled' && !canCustomerCancel(order)) {
      throw new ConflictException(
        `This order has been ${order.status}, so it can't be cancelled. Please contact us about a return.`,
      );
    }
    return this.updateStatus(number, 'cancelled');
  }

  /** The page where the customer can finish paying, while there's still time. */
  async resumePayment(customerId: string, number: number): Promise<PaymentLink> {
    const order = await findOrder(
      this.db,
      and(eq(orders.number, number), eq(orders.userId, customerId))!,
    );
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
    const [order] = await this.db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .where(eq(orders.stripeSessionId, sessionId));
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
    const overdue = await this.db
      .select({ number: orders.number, stripeSessionId: orders.stripeSessionId })
      .from(orders)
      .where(
        and(
          eq(orders.paymentMethod, 'card'),
          eq(orders.paymentStatus, 'unpaid'),
          eq(orders.status, 'pending'),
          lt(orders.createdAt, before),
        ),
      )
      .orderBy(asc(orders.createdAt))
      .limit(OVERDUE_BATCH);

    for (const { number, stripeSessionId } of overdue) {
      try {
        // No session means the API stopped while starting the payment.
        if (stripeSessionId) await this.syncPayment(stripeSessionId);
        else await this.updateStatus(number, 'cancelled', { notify: false });
      } catch (error) {
        this.logger.error(`Settling the payment of order #${number} failed`, error);
      }
    }
    return overdue.length;
  }

  /** Every order, newest first (admin). */
  listAll(query: OrderListQuery): Promise<OrderList> {
    return this.list(
      query.refundDue ? refundDueWhere : query.status ? eq(orders.status, query.status) : undefined,
      query,
    );
  }

  async findAny(number: number): Promise<Order> {
    const order = await findOrder(this.db, eq(orders.number, number));
    if (!order) throw new NotFoundException('Order not found');
    return toOrder(order);
  }

  countRefundsDue(): Promise<number> {
    return this.db.$count(orders, refundDueWhere);
  }

  /**
   * Tries a failed refund again. Each try needs its own idempotency key, because
   * Stripe replays a key's earlier failure. That can't pay twice: Stripe refuses
   * to refund a charge beyond its amount.
   */
  async retryRefund(number: number): Promise<Order> {
    const row = await findOrder(this.db, eq(orders.number, number));
    if (!row) throw new NotFoundException('Order not found');
    if (!isRefundDue(row)) throw new ConflictException('This order has no refund due.');

    if (!(await this.refund(row, `refund-${row.id}-${Date.now()}`))) {
      throw new ServiceUnavailableException(
        "The refund didn't go through. Try again, or refund it in Stripe's dashboard and then retry here.",
      );
    }
    const order: Order = { ...toOrder(row), paymentStatus: 'refunded' };
    this.notify(order, orderRefundedEmail);
    return order;
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
    const { order, changed } = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select({
          id: orders.id,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
        })
        .from(orders)
        .where(eq(orders.number, number));
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

      const moved = await tx
        .update(orders)
        .set(
          touch({ status, ...(status === 'delivered' ? { paymentStatus: 'paid' as const } : {}) }),
        )
        .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
        .returning({ id: orders.id });
      if (moved.length === 0)
        throw new ConflictException('The order was just changed. Please reload.');

      if (status === 'cancelled') {
        const items = await tx
          .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
          .from(orderItems)
          .where(and(eq(orderItems.orderId, order.id), isNotNull(orderItems.variantId)));
        for (const item of items) {
          await tx
            .update(productVariants)
            .set(touch({ stock: sql`${productVariants.stock} + ${item.quantity}` }))
            .where(eq(productVariants.id, item.variantId!));
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

    await this.db.transaction(async (tx) => {
      found(
        await tx
          .update(orders)
          .set(touch({ stripeSessionId: session.id }))
          .where(eq(orders.number, order.number))
          .returning({ id: orders.id }),
      );
      await tx
        .delete(cartItems)
        .where(
          and(
            inArray(
              cartItems.cartId,
              tx.select({ id: carts.id }).from(carts).where(eq(carts.userId, customer.id)),
            ),
            inArray(cartItems.variantId, variantIds),
          ),
        );
    });
    return session.url;
  }

  /**
   * Records a payment. Conditional updates mean only the first call does anything,
   * and a cancellation at the same moment isn't undone. A payment that arrives
   * after the order was cancelled goes straight back to the customer.
   */
  private async markPaid(id: string, paymentIntentId: string | null): Promise<void> {
    const order = await this.db.transaction(async (tx) => {
      const paid = await tx
        .update(orders)
        .set(touch({ paymentStatus: 'paid' as const, stripePaymentIntentId: paymentIntentId }))
        .where(and(eq(orders.id, id), eq(orders.paymentStatus, 'unpaid')))
        .returning({ id: orders.id });
      if (paid.length === 0) return null;
      await tx
        .update(orders)
        .set(touch({ status: 'confirmed' as const }))
        .where(and(eq(orders.id, id), eq(orders.status, 'pending')));
      return this.select(tx, id);
    });
    if (!order) return;

    if (order.status === 'cancelled') {
      this.logger.warn(`Order #${order.number} was paid after being cancelled; refunding`);
      if (await this.refund(order)) {
        this.notify({ ...toOrder(order), paymentStatus: 'refunded' }, orderRefundedEmail);
      }
    } else {
      this.notify(toOrder(order), orderPlacedEmail);
    }
  }

  /** Settles a card order that was just cancelled. Stripe failing doesn't undo the cancel. */
  private async closePayment(order: Order, expireSession: boolean): Promise<Order> {
    if (order.paymentMethod !== 'card') return order;

    const row = orNotFound(await findOrder(this.db, eq(orders.number, order.number)));
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
  private async refund(order: OrderRow, idempotencyKey = `refund-${order.id}`): Promise<boolean> {
    try {
      if (!order.stripePaymentIntentId) throw new Error('The order has no payment intent');
      await this.gateway.refund(order.stripePaymentIntentId, idempotencyKey);
      await this.db
        .update(orders)
        .set(touch({ paymentStatus: 'refunded' as const }))
        .where(eq(orders.id, order.id));
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

  private async select(tx: Queryable, id: string): Promise<OrderRow> {
    return orNotFound(await findOrder(tx, eq(orders.id, id)));
  }

  private async list(where: SQL | undefined, query: OrderListQuery): Promise<OrderList> {
    const [rows, total] = await Promise.all([
      this.db
        .select({
          id: orders.id,
          number: orders.number,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          email: orders.email,
          customerName: orders.fullName,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(where)
        .orderBy(desc(orders.createdAt))
        .offset((query.page - 1) * query.pageSize)
        .limit(query.pageSize),
      this.db.$count(orders, where),
    ]);
    const counts = rows.length
      ? await this.db
          .select({ orderId: orderItems.orderId, items: sum(orderItems.quantity).mapWith(Number) })
          .from(orderItems)
          .where(
            inArray(
              orderItems.orderId,
              rows.map((row) => row.id),
            ),
          )
          .groupBy(orderItems.orderId)
      : [];
    const itemCount = new Map(counts.map((count) => [count.orderId, count.items]));

    return {
      orders: rows.map(({ id, createdAt, ...row }) => ({
        ...row,
        itemCount: itemCount.get(id) ?? 0,
        createdAt: createdAt.toISOString(),
      })),
      total,
    };
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
