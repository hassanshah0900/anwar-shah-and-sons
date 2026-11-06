import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DASHBOARD_DAYS, LOW_STOCK_THRESHOLD, type Dashboard } from '@repo/shared';
import type { Env } from '../config/env.js';
import { OrdersService } from '../orders/orders.service.js';
import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { InjectDatabase } from '../db/database.module.js';
import {
  orders as ordersTable,
  productOptions,
  products,
  productVariants,
} from '../db/schema/index.js';

const LOW_STOCK_LIMIT = 10;

/** pg returns bigint sums as strings. */
type DayRow = { day: string; orders: number; revenue: string };

/** Figures for the admin overview. Read-only. */
@Injectable()
export class DashboardService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
    private readonly orders: OrdersService,
  ) {}

  async overview(): Promise<Dashboard> {
    const timeZone = this.config.get('STORE_TIMEZONE', { infer: true });
    // Not correlated: Drizzle's relational queries alias the outer table, so a subquery
    // can't refer back to it by name.
    const lowStockWhere = and(
      lte(productVariants.stock, LOW_STOCK_THRESHOLD),
      inArray(
        productVariants.productId,
        this.db.select({ id: products.id }).from(products).where(eq(products.status, 'active')),
      ),
    );

    const [today, days, pendingOrders, toShip, refundsDue, lowStock, lowStockCount, recent] =
      await Promise.all([
        this.localToday(timeZone),
        this.dailyTotals(timeZone),
        // Unpaid card orders are the customer's next step, not the store's.
        this.db.$count(
          ordersTable,
          and(eq(ordersTable.status, 'pending'), eq(ordersTable.paymentMethod, 'cod')),
        ),
        this.db.$count(ordersTable, eq(ordersTable.status, 'confirmed')),
        this.orders.countRefundsDue(),
        this.db.query.productVariants.findMany({
          where: lowStockWhere,
          orderBy: [asc(productVariants.stock), desc(productVariants.updatedAt)],
          limit: LOW_STOCK_LIMIT,
          columns: { sku: true, stock: true },
          with: {
            product: {
              columns: { id: true, name: true },
              with: {
                options: {
                  columns: { optionTypeId: true },
                  orderBy: [asc(productOptions.position)],
                },
              },
            },
            optionValues: {
              columns: {},
              with: {
                optionValue: {
                  columns: { label: true, optionTypeId: true },
                  with: { optionType: { columns: { name: true } } },
                },
              },
            },
          },
        }),
        this.db.$count(productVariants, lowStockWhere),
        this.orders.listAll({ page: 1, pageSize: 5 }),
      ]);

    const byDay = new Map(days.map((row) => [row.day, row]));
    const daily = lastDays(today, DASHBOARD_DAYS).map((date) => {
      const row = byDay.get(date);
      return { date, orders: row?.orders ?? 0, revenue: Number(row?.revenue ?? 0) };
    });
    const period = daily.reduce(
      (sum, day) => ({ orders: sum.orders + day.orders, revenue: sum.revenue + day.revenue }),
      { orders: 0, revenue: 0 },
    );
    const todayTotals = daily.at(-1)!;

    return {
      currency: this.config.get('STORE_CURRENCY', { infer: true }),
      timeZone,
      today: { orders: todayTotals.orders, revenue: todayTotals.revenue },
      period: {
        ...period,
        averageOrderValue: period.orders ? Math.round(period.revenue / period.orders) : 0,
      },
      daily,
      pendingOrders,
      toShip,
      refundsDue,
      lowStock: lowStock.map((variant) => {
        const typeOrder = variant.product.options.map((option) => option.optionTypeId);
        return {
          productId: variant.product.id,
          productName: variant.product.name,
          variantLabel: variant.optionValues
            .map(({ optionValue }) => optionValue)
            .sort((a, b) => typeOrder.indexOf(a.optionTypeId) - typeOrder.indexOf(b.optionTypeId))
            .map((value) => `${value.optionType.name}: ${value.label}`)
            .join(' · '),
          sku: variant.sku,
          stock: variant.stock,
        };
      }),
      lowStockCount,
      recentOrders: recent.orders,
    };
  }

  /** Today's date in the store's time zone, as YYYY-MM-DD. */
  private async localToday(timeZone: string): Promise<string> {
    const { rows } = await this.db.execute<{ today: string }>(sql`
      SELECT to_char((now() AT TIME ZONE ${timeZone})::date, 'YYYY-MM-DD') AS today`);
    return rows[0]!.today;
  }

  /**
   * Orders and revenue per local day over the period, without cancelled orders or
   * card orders that haven't been paid.
   * created_at is stored in UTC, so it's converted to the store's zone first.
   */
  private async dailyTotals(timeZone: string): Promise<DayRow[]> {
    const { rows } = await this.db.execute<DayRow>(sql`
      WITH local AS (
        SELECT (created_at AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date AS day, total
        FROM orders
        WHERE status <> 'cancelled' AND NOT (payment_method = 'card' AND payment_status = 'unpaid')
      )
      SELECT to_char(day, 'YYYY-MM-DD') AS day, count(*)::int AS orders, sum(total)::bigint AS revenue
      FROM local
      WHERE day > (now() AT TIME ZONE ${timeZone})::date - ${DASHBOARD_DAYS}::int
      GROUP BY day`);
    return rows;
  }
}

/** The `count` dates ending on `today` (YYYY-MM-DD), oldest first. */
export function lastDays(today: string, count: number): string[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) =>
    new Date(end - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  );
}
