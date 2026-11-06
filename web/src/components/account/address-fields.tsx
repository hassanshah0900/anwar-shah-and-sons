import type { ShippingAddress } from '@repo/shared';
import { FormField } from '@/components/forms/form-field';

type Values = Partial<Record<keyof ShippingAddress, string | null>>;

/**
 * The shipping address inputs, shared by checkout and the address book.
 * Field names are `${prefix}fullName` etc., matching the schema paths, so
 * validation errors land on the right input.
 */
export function AddressFields({
  prefix = '',
  idPrefix,
  defaults = {},
  errors = {},
}: {
  prefix?: string;
  /** Keeps ids unique when the fields appear more than once on a page. */
  idPrefix: string;
  defaults?: Values;
  errors?: Record<string, string>;
}) {
  const field = (key: keyof ShippingAddress) => ({
    name: `${prefix}${key}`,
    id: `${idPrefix}-${key}`,
    defaultValue: defaults[key] ?? undefined,
    error: errors[`${prefix}${key}`],
  });

  return (
    <div className="grid gap-5">
      <FormField label="Full name" autoComplete="name" {...field('fullName')} />
      <FormField label="Phone" type="tel" autoComplete="tel" {...field('phone')} />
      <FormField label="Address" autoComplete="address-line1" {...field('line1')} />
      <FormField
        label="Apartment, suite, etc. (optional)"
        autoComplete="address-line2"
        {...field('line2')}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="City" autoComplete="address-level2" {...field('city')} />
        <FormField
          label="Postal code (optional)"
          autoComplete="postal-code"
          {...field('postalCode')}
        />
      </div>
    </div>
  );
}

/** Reads AddressFields from a submitted form. */
export function readAddress(
  formData: FormData,
  prefix = '',
): Record<keyof ShippingAddress, string | undefined> {
  const text = (key: keyof ShippingAddress) => {
    const value = formData.get(`${prefix}${key}`);
    return typeof value === 'string' ? value : undefined;
  };
  return {
    fullName: text('fullName'),
    phone: text('phone'),
    line1: text('line1'),
    line2: text('line2'),
    city: text('city'),
    postalCode: text('postalCode'),
  };
}
