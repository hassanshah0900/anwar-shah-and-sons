'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkoutSchema } from '@repo/shared';
import { readAddress } from '@/components/account/address-fields';
import { placeOrder } from '@/lib/api/orders';
import { requireUser } from '@/lib/auth/session';
import type { ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';

/** Field names match the schema paths ("address.phone"), so errors land on the right input. */
export async function placeOrderAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser('/checkout');

  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value : undefined;
  };
  const parsed = checkoutSchema.safeParse({
    address: readAddress(formData, 'address.'),
    paymentMethod: text('paymentMethod'),
    saveAddress: formData.get('saveAddress') === 'on',
    notes: text('notes'),
    expectedTotal: Number(text('expectedTotal')),
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  let number: number;
  try {
    ({ number } = await placeOrder(parsed.data));
  } catch (error) {
    return apiErrorState(error, formData);
  }
  // The bag is now empty: refresh so the header's count updates too.
  refresh();
  redirect(`/account/orders/${number}?placed=1`);
}
