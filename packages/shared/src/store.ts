import { z } from 'zod';

const moneySchema = z.number().int().nonnegative();

/** Store-wide settings exposed to clients. */
export const storeConfigSchema = z.object({
  /** ISO 4217 code, e.g. PKR. Prices are integers in this currency's minor unit. */
  currency: z.string().length(3),
  /** BCP 47 locale for formatting, e.g. en-PK. */
  locale: z.string().min(2),
  shipping: z.object({
    /** Charged per order, in minor units. */
    flatRate: moneySchema,
    /** Orders with a subtotal at or above this ship free; null when there's no such offer. */
    freeOver: moneySchema.nullable(),
  }),
});
export type StoreConfig = z.infer<typeof storeConfigSchema>;

/** The shipping charge for a subtotal. Shared so the checkout page and the API agree. */
export function shippingFor(subtotal: number, shipping: StoreConfig['shipping']): number {
  return shipping.freeOver !== null && subtotal >= shipping.freeOver ? 0 : shipping.flatRate;
}
