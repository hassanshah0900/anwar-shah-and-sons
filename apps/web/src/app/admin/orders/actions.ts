'use server';

import { refresh } from 'next/cache';
import { orderStatusUpdateSchema } from '@repo/shared';
import { updateOrderStatus } from '@/lib/api/orders';
import { requireAdmin } from '@/lib/auth/session';
import type { ActionState } from '@/lib/forms/action-state';
import { apiErrorState } from '@/lib/forms/server';

export async function updateOrderStatusAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/orders');

  const number = Number(formData.get('number'));
  const parsed = orderStatusUpdateSchema.safeParse({ status: formData.get('status') });
  if (!Number.isInteger(number) || !parsed.success) {
    return { status: 'error', message: 'That status change is not valid.' };
  }

  try {
    await updateOrderStatus(number, parsed.data.status);
  } catch (error) {
    return apiErrorState(error, formData);
  }
  refresh();
  return { status: 'success' };
}
