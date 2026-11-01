import { currencyExponent, formatMoney, toMinorUnits, type StoreConfig } from '@repo/shared';

/** Formats an amount in minor units for the store, e.g. 4990 -> "Rs 4,990". */
export function formatPrice(minor: number, store: StoreConfig): string {
  return formatMoney(minor, store.currency, store.locale);
}

/**
 * Reads a price typed in major units ("4990", "49.90") into minor units.
 * Returns undefined for a blank field and NaN for text that isn't a valid amount,
 * so schema validation reports it.
 */
export function parsePrice(value: FormDataEntryValue | null, currency: string): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  const normalised = value.replaceAll(',', '').trim();
  const exponent = currencyExponent(currency);
  const pattern = exponent > 0 ? new RegExp(`^\\d+(\\.\\d{1,${exponent}})?$`) : /^\d+$/;
  if (!pattern.test(normalised)) return Number.NaN;

  return toMinorUnits(Number(normalised), currency);
}

/** Shows minor units as a plain major-unit number for an input, e.g. 4990 USD -> "49.90". */
export function priceInputValue(minor: number | null | undefined, currency: string): string {
  if (minor == null) return '';
  const exponent = currencyExponent(currency);
  return (minor / 10 ** exponent).toFixed(exponent);
}
