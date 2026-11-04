import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DASHBOARD_DAYS, LOW_STOCK_THRESHOLD, type Dashboard } from '@repo/shared';
import type { Env } from '../config/env.js';
import { OrdersService } from '../orders/orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const LOW_STOCK_LIMIT = 10;

type DayRow = { day: string; orders: number; revenue: bigint };

/** Figures for the admin overview. Read-only. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly orders: OrdersService,
  ) {}

  async overview(): Promise<Dashboard> {
    const timeZone = this.config.get('STORE_TIMEZONE', { infer: true });
    const lowStockWhere = {
      stock: { lte: LOW_STOCK_THRESHOLD },
      product: { status: 'active' as const },
    };

    const [today, days, pendingOrders, toShip, lowStock, lowStockCount, recent] = await Promise.all(
      [
        this.localToday(timeZone),
        this.dailyTotals(timeZone),
        this.prisma.order.count({ where: { status: 'pending' } }),
        this.prisma.order.count({ where: { status: 'confirmed' } }),
        this.prisma.productVariant.findMany({
          where: lowStockWhere,
          orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
          take: LOW_STOCK_LIMIT,
          select: {
            sku: true,
            stock: true,
            product: {
              select: {
                id: true,
                name: true,
                options: { select: { optionTypeId: true }, orderBy: { position: 'asc' } },
              },
            },
            optionValues: {
              select: {
                optionValue: {
                  select: {
                    label: true,
                    optionTypeId: true,
                    optionType: { select: { name: true } },
                  },
                },
              },
            },
          },
        }),
        this.prisma.productVariant.count({ where: lowStockWhere }),
        this.orders.listAll({ page: 1, pageSize: 5 }),
      ],
    );

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
    const [row] = await this.prisma.$queryRaw<{ today: string }[]>`
      SELECT to_char((now() AT TIME ZONE ${timeZone})::date, 'YYYY-MM-DD') AS today`;
    return row!.today;
  }

  /**
   * Orders and revenue per local day over the period, cancelled orders excluded.
   * created_at is stored in UTC, so it's converted to the store's zone first.
   */
  private dailyTotals(timeZone: string): Promise<DayRow[]> {
    return this.prisma.$queryRaw<DayRow[]>`
      WITH local AS (
        SELECT (created_at AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone})::date AS day, total
        FROM orders
        WHERE status <> 'cancelled'
      )
      SELECT to_char(day, 'YYYY-MM-DD') AS day, count(*)::int AS orders, sum(total)::bigint AS revenue
      FROM local
      WHERE day > (now() AT TIME ZONE ${timeZone})::date - ${DASHBOARD_DAYS}::int
      GROUP BY day`;
  }
}

/** The `count` dates ending on `today` (YYYY-MM-DD), oldest first. */
export function lastDays(today: string, count: number): string[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) =>
    new Date(end - (count - 1 - index) * 86_400_000).toISOString().slice(0, 10),
  );
}
