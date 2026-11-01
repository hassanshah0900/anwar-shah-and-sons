/**
 * Prices are stored as integers in the currency's minor unit, as defined by the
 * runtime's currency data (Intl). PKR has 0 fraction digits, so Rs 4,990 is
 * stored as 4990; USD has 2, so $49.90 is stored as 4990.
 */
export function currencyExponent(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 0
  );
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * 10 ** currencyExponent(currency));
}

export function fromMinorUnits(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

export function formatMoney(minor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    fromMinorUnits(minor, currency),
  );
}
