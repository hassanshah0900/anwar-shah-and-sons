/**
 * The top of a value axis: the smallest "nice" number (1, 2, 2.5 or 5 times a
 * power of ten) at or above `max`, so ticks at 0, half and the top read cleanly.
 */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= max)!;
  return step * power;
}

/** Axis numbers: in full below 10,000, compact above (12K, 1.5M). */
export function formatTick(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}
