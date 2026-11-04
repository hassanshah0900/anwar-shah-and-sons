import { z } from 'zod';
import { shippingAddressSchema } from './orders.js';

/** A customer may keep this many addresses. */
export const MAX_ADDRESSES = 10;

/** A saved shipping address. The default one fills in checkout. */
export const addressSchema = shippingAddressSchema.extend({
  id: z.string().min(1),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof addressSchema>;

export const addressListSchema = z.object({ addresses: z.array(addressSchema) });
export type AddressList = z.infer<typeof addressListSchema>;

export const addressInputSchema = shippingAddressSchema.extend({
  /** Makes this the default; the previous default stops being one. */
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.input<typeof addressInputSchema>;
export type AddressInputParsed = z.output<typeof addressInputSchema>;

/** Optional text that may be cleared: "" or null clears it, a missing field leaves it alone. */
const clearableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null)
    .optional();

const { shape } = shippingAddressSchema;

/**
 * Updates may change any field; fields left out keep their value. Written out
 * rather than .partial(), which would turn a missing line2 into null.
 * isDefault can only be set to true: to change the default, choose another one.
 */
export const addressUpdateSchema = z.object({
  fullName: shape.fullName.optional(),
  phone: shape.phone.optional(),
  line1: shape.line1.optional(),
  line2: clearableText(200),
  city: shape.city.optional(),
  postalCode: clearableText(20),
  isDefault: z.literal(true).optional(),
});
export type AddressUpdate = z.output<typeof addressUpdateSchema>;
