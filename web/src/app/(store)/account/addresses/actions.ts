'use server';

import { refresh } from 'next/cache';
import { addressInputSchema } from '@repo/shared';
import { readAddress } from '@/components/account/address-fields';
import { createAddress, deleteAddress, updateAddress } from '@/lib/api/addresses';
import { requireUser } from '@/lib/auth/session';
import type { ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';

const RETURN_TO = '/account/addresses';

/** Adds an address, or edits one when the form carries an `id`. */
export async function saveAddress(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(RETURN_TO);

  const parsed = addressInputSchema.safeParse({
    ...readAddress(formData),
    isDefault: formData.get('isDefault') === 'on' || undefined,
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  const id = formData.get('id');
  try {
    if (typeof id === 'string' && id) {
      // Edits send every field; blank optional lines are cleared.
      const { isDefault, ...fields } = parsed.data;
      await updateAddress(id, { ...fields, ...(isDefault && { isDefault: true as const }) });
    } else {
      await createAddress(parsed.data);
    }
  } catch (error) {
    return apiErrorState(error, formData);
  }
  refresh();
  return { status: 'success' };
}

export async function makeDefaultAddress(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser(RETURN_TO);
  try {
    await updateAddress(String(formData.get('id')), { isDefault: true });
  } catch (error) {
    return apiErrorState(error, formData);
  }
  refresh();
  return { status: 'success' };
}

export async function removeAddress(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser(RETURN_TO);
  try {
    await deleteAddress(String(formData.get('id')));
  } catch (error) {
    return apiErrorState(error, formData);
  }
  refresh();
  return { status: 'success' };
}
