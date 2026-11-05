import { z } from 'zod';
import { orderSummarySchema } from './orders.js';

/** How many days the dashboard's trend covers, ending today. */
export const DASHBOARD_DAYS = 30;

const countSchema = z.number().int().nonnegative();
const moneySchema = z.number().int().nonnegative();

const periodSchema = z.object({ orders: countSchema, revenue: moneySchema });

/**
 * The admin overview. Revenue is the total of orders that weren't cancelled,
 * in the store currency. Days follow the store's time zone.
 */
export const dashboardSchema = z.object({
  currency: z.string().length(3),
  timeZone: z.string(),
  today: periodSchema,
  period: periodSchema.extend({ averageOrderValue: moneySchema }),
  /** One entry per day, oldest first, including days without orders. */
  daily: z.array(periodSchema.extend({ date: z.iso.date() })),
  /** Orders waiting for the store: to confirm, and confirmed but not yet shipped. */
  pendingOrders: countSchema,
  toShip: countSchema,
  /** Cancelled orders whose refund failed; someone needs to act on these. */
  refundsDue: countSchema,
  /** Variants of active products at or below the low-stock threshold, emptiest first. */
  lowStock: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      variantLabel: z.string(),
      sku: z.string(),
      stock: z.number().int(),
    }),
  ),
  lowStockCount: countSchema,
  recentOrders: z.array(orderSummarySchema),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
