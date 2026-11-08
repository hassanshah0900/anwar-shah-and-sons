'use server';

import { refresh } from 'next/cache';
import {
  optionTypeInputSchema,
  optionTypeSchema,
  optionValueInputSchema,
  optionValueSchema,
} from '@repo/shared';
import { apiCommand, apiRequest } from '@/lib/api/server';
import { saveOrder } from '@/lib/api/reorder';
import { requireAdmin } from '@/lib/auth/session';
import { optionalText, type ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';

const BASE = '/api/v1/admin/option-types';
const segment = (value: FormDataEntryValue | null) => encodeURIComponent(String(value));

export async function saveOptionType(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/options');

  const id = optionalText(formData, 'id');
  // The kind can only be chosen on creation.
  const schema = id ? optionTypeInputSchema.omit({ kind: true }) : optionTypeInputSchema;
  const parsed = schema.safeParse({
    name: formData.get('name'),
    slug: optionalText(formData, 'slug'),
    kind: formData.get('kind'),
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await apiRequest(id ? `${BASE}/${segment(id)}` : BASE, optionTypeSchema, {
      method: id ? 'PATCH' : 'POST',
      body: parsed.data,
    });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}

export async function deleteOptionType(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/options');

  try {
    await apiCommand(`${BASE}/${segment(formData.get('id'))}`, { method: 'DELETE' });
  } catch (error) {
    return apiErrorState(error, formData, { 409: 'This option is used by products.' });
  }

  refresh();
  return { status: 'success' };
}

export async function saveOptionValue(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/options');

  const typeId = segment(formData.get('typeId'));
  const valueId = optionalText(formData, 'valueId');
  const parsed = optionValueInputSchema.safeParse({
    label: formData.get('label'),
    slug: optionalText(formData, 'slug'),
    colorHex: optionalText(formData, 'colorHex'),
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await apiRequest(
      valueId
        ? `${BASE}/${typeId}/values/${encodeURIComponent(valueId)}`
        : `${BASE}/${typeId}/values`,
      optionValueSchema,
      { method: valueId ? 'PATCH' : 'POST', body: parsed.data },
    );
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}

export async function deleteOptionValue(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/options');

  try {
    await apiCommand(
      `${BASE}/${segment(formData.get('typeId'))}/values/${segment(formData.get('valueId'))}`,
      { method: 'DELETE' },
    );
  } catch (error) {
    return apiErrorState(error, formData, { 409: 'This value is used by products.' });
  }

  refresh();
  return { status: 'success' };
}

export async function reorderOptionValues(typeId: string, ids: string[]) {
  await requireAdmin('/admin/options');
  return saveOrder(`/api/v1/admin/option-types/${encodeURIComponent(typeId)}/values/order`, {
    ids,
  });
}
