import { z } from 'zod';

/**
 * Orders. An order copies product names, options and prices at the time of
 * purchase, so later catalog changes never rewrite history.
 */

const moneySchema = z.number().int().nonnegative();

export const orderStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export const orderStatusSchema = z.enum(orderStatuses);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Where an order can go next. Cancelling returns its items to stock. */
export const orderStatusTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const paymentMethods = ['cod'] as const;
export const paymentMethodSchema = z.enum(paymentMethods);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, 'Enter a valid phone number'),
  line1: z.string().trim().min(1, 'Enter your address').max(200),
  line2: optionalText(200),
  city: z.string().trim().min(1, 'Enter your city').max(100),
  postalCode: optionalText(20),
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const checkoutSchema = z.object({
  address: shippingAddressSchema,
  paymentMethod: paymentMethodSchema.default('cod'),
  notes: optionalText(500),
  /**
   * The total the shopper saw. If prices changed since, the order is refused
   * rather than charging a different amount.
   */
  expectedTotal: moneySchema,
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type Checkout = z.output<typeof checkoutSchema>;

export const orderItemSchema = z.object({
  productName: z.string(),
  /** Null once the product is deleted. */
  productSlug: z.string().nullable(),
  /** The variant's options at purchase, e.g. "Colour: Black · Size: M". */
  variantLabel: z.string(),
  sku: z.string(),
  imageKey: z.string().nullable(),
  unitPrice: moneySchema,
  quantity: z.number().int().positive(),
  lineTotal: moneySchema,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  /** Shown to people, e.g. 1001. */
  number: z.number().int().positive(),
  status: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  email: z.string(),
  address: shippingAddressSchema,
  notes: z.string().nullable(),
  currency: z.string().length(3),
  subtotal: moneySchema,
  shipping: moneySchema,
  total: moneySchema,
  items: z.array(orderItemSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Order = z.infer<typeof orderSchema>;

export const orderSummarySchema = z.object({
  number: z.number().int().positive(),
  status: orderStatusSchema,
  email: z.string(),
  customerName: z.string(),
  itemCount: z.number().int().nonnegative(),
  total: moneySchema,
  createdAt: z.iso.datetime(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const orderListSchema = z.object({
  orders: z.array(orderSummarySchema),
  total: z.number().int().nonnegative(),
});
export type OrderList = z.infer<typeof orderListSchema>;

export const orderListQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const orderStatusUpdateSchema = z.object({ status: orderStatusSchema });
export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;
