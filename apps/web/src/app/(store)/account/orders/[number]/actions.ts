'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { cancelMyOrder, resumePayment } from '@/lib/api/orders';
import { requireUser } from '@/lib/auth/session';
import type { ActionState } from '@/lib/forms/action-state';
import { apiErrorState } from '@/lib/forms/server';

export async function payNowAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const number = Number(formData.get('number'));
  await requireUser(`/account/orders/${number}`);
  if (!Number.isInteger(number) || number < 1) {
    return { status: 'error', message: 'That order could not be found.' };
  }

  let url: string;
  try {
    ({ url } = await resumePayment(number));
  } catch (error) {
    return apiErrorState(error, formData);
  }
  redirect(url);
}

export async function cancelOrderAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const number = Number(formData.get('number'));
  await requireUser(`/account/orders/${number}`);
  if (!Number.isInteger(number) || number < 1) {
    return { status: 'error', message: 'That order could not be found.' };
  }

  try {
    await cancelMyOrder(number);
  } catch (error) {
    return apiErrorState(error, formData);
  }
  refresh();
  return { status: 'success' };
}
