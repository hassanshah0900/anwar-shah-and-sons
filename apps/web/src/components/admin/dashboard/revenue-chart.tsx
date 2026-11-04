import { fromMinorUnits, type Dashboard } from '@repo/shared';
import { formatTick, niceMax } from '@/lib/charts/scale';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';

type Day = Dashboard['daily'][number];
type Money = { currency: string; locale: string };

const dayLabel = (date: string, locale: string, month: 'short' | 'long' = 'short') =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );

/**
 * Daily revenue as columns: one series in the foreground ink, so no legend.
 * Each column shows its date, revenue and orders on hover or keyboard focus,
 * and the same figures are available as a table below.
 */
export function RevenueChart({ daily, money }: { daily: Day[]; money: Money }) {
  const majorMax = fromMinorUnits(Math.max(0, ...daily.map((day) => day.revenue)), money.currency);
  const top = niceMax(majorMax);
  const total = daily.reduce((sum, day) => sum + day.revenue, 0);
  const ticks = total === 0 ? [] : [top, top / 2, 0];

  return (
    <figure className="flex flex-col gap-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Revenue, last {daily.length} days</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatPrice(total, money)} in total · {money.currency}
        </span>
      </figcaption>

      <div className="flex gap-3">
        {/* Value axis */}
        <div
          aria-hidden
          className="flex h-48 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums"
        >
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 last:translate-y-1/2">
              {formatTick(tick, money.locale)}
            </span>
          ))}
        </div>

        <div className="relative h-48 flex-1">
          {total === 0 && (
            <p className="absolute inset-0 z-10 grid place-items-center text-sm text-muted-foreground">
              No sales in this period yet.
            </p>
          )}
          {/* Hairline gridlines at the top and middle; the baseline is solid. */}
          <div aria-hidden className="absolute inset-x-0 top-0 border-t border-border" />
          <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-border" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-foreground/40" />

          <ol aria-label="Revenue by day" className="absolute inset-0 flex items-end gap-0.5">
            {daily.map((day, index) => {
              const height = (fromMinorUnits(day.revenue, money.currency) / top) * 100;
              const align =
                index < 4
                  ? 'left-0'
                  : index > daily.length - 5
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2';
              const summary = `${dayLabel(day.date, money.locale, 'long')}: ${formatPrice(day.revenue, money)}, ${day.orders} ${day.orders === 1 ? 'order' : 'orders'}`;

              return (
                <li
                  key={day.date}
                  tabIndex={0}
                  aria-label={summary}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-xs outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {day.revenue > 0 && (
                    <span
                      aria-hidden
                      className="w-3/4 max-w-6 rounded-t-lg bg-foreground"
                      // Data-driven height; a data value, not a design token.
                      style={{ height: `${Math.max(height, 1)}%` }}
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute -top-2 z-10 hidden -translate-y-full flex-col gap-0.5 rounded-md border bg-popover px-3 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover:flex group-focus-visible:flex',
                      align,
                    )}
                  >
                    <span className="text-muted-foreground">
                      {dayLabel(day.date, money.locale)}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatPrice(day.revenue, money)}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {day.orders} {day.orders === 1 ? 'order' : 'orders'}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Date axis: first, middle and last day. */}
      <div aria-hidden className="ml-12 flex justify-between text-xs text-muted-foreground">
        {[daily[0], daily[Math.floor((daily.length - 1) / 2)], daily.at(-1)].map(
          (day) => day && <span key={day.date}>{dayLabel(day.date, money.locale)}</span>,
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Show as a table
        </summary>
        <table className="mt-3 w-full text-left tabular-nums">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 font-normal">Day</th>
              <th className="py-2 text-right font-normal">Orders</th>
              <th className="py-2 text-right font-normal">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {[...daily].reverse().map((day) => (
              <tr key={day.date} className="border-b last:border-b-0">
                <td className="py-1.5">{dayLabel(day.date, money.locale)}</td>
                <td className="py-1.5 text-right">{day.orders}</td>
                <td className="py-1.5 text-right">{formatPrice(day.revenue, money)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
