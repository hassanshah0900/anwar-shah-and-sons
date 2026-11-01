import { z } from 'zod';

/** Store-wide settings exposed to clients. */
export const storeConfigSchema = z.object({
  /** ISO 4217 code, e.g. PKR. Prices are integers in this currency's minor unit. */
  currency: z.string().length(3),
  /** BCP 47 locale for formatting, e.g. en-PK. */
  locale: z.string().min(2),
});
export type StoreConfig = z.infer<typeof storeConfigSchema>;
