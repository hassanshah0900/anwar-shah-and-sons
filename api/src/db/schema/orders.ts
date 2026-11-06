import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { products, productVariants } from './catalog.js';
import { createdAt, fk, id, updatedAt } from './columns.js';

export const orderStatus = pgEnum('order_status', [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]);
export const paymentMethod = pgEnum('payment_method', ['cod', 'card']);
export const paymentStatus = pgEnum('payment_status', ['unpaid', 'paid', 'refunded']);

/**
 * A placed order. Amounts are in `currency`'s minor unit, fixed at purchase. The address
 * is copied onto the order so later profile edits don't change it.
 */
export const orders = pgTable(
  'orders',
  {
    id: id(),
    /** Shown to people; starts at 1001 (see the baseline migration). */
    number: serial('number').notNull(),
    /** Null if the customer's account is deleted; the order is kept. */
    userId: text('user_id'),
    email: text('email').notNull(),
    status: orderStatus('status').notNull().default('pending'),
    paymentMethod: paymentMethod('payment_method').notNull(),
    paymentStatus: paymentStatus('payment_status').notNull().default('unpaid'),
    /** The Stripe Checkout session paying a card order. */
    stripeSessionId: text('stripe_session_id'),
    /** Set once paid; refunds go through it. */
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    currency: text('currency').notNull(),
    subtotal: integer('subtotal').notNull(),
    shipping: integer('shipping').notNull(),
    total: integer('total').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city').notNull(),
    postalCode: text('postal_code'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('orders_number_key').on(t.number),
    uniqueIndex('orders_stripe_session_id_key').on(t.stripeSessionId),
    index('orders_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('orders_status_created_at_idx').on(t.status, t.createdAt),
    fk('orders_user_id_fkey', t.userId, users.id, 'set null'),
    check(
      'orders_amounts_check',
      sql`${t.subtotal} >= 0 AND ${t.shipping} >= 0 AND ${t.total} = ${t.subtotal} + ${t.shipping}`,
    ),
  ],
);

/** A line of an order: what was bought, described and priced as it was then. */
export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: text('order_id').notNull(),
    /** Kept for restocking on cancel; null once the variant or product is deleted. */
    variantId: text('variant_id'),
    productId: text('product_id'),
    productName: text('product_name').notNull(),
    variantLabel: text('variant_label').notNull(),
    sku: text('sku').notNull(),
    imageKey: text('image_key'),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotal: integer('line_total').notNull(),
  },
  (t) => [
    index('order_items_order_id_idx').on(t.orderId),
    index('order_items_variant_id_idx').on(t.variantId),
    index('order_items_product_id_idx').on(t.productId),
    fk('order_items_order_id_fkey', t.orderId, orders.id, 'cascade'),
    fk('order_items_variant_id_fkey', t.variantId, productVariants.id, 'set null'),
    fk('order_items_product_id_fkey', t.productId, products.id, 'set null'),
    check(
      'order_items_amounts_check',
      sql`${t.quantity} > 0 AND ${t.unitPrice} >= 0 AND ${t.lineTotal} = ${t.unitPrice} * ${t.quantity}`,
    ),
  ],
);
