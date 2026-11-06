'use server';

import { refresh } from 'next/cache';
import { categoryInputSchema, categorySchema } from '@repo/shared';
import { apiCommand, apiRequest } from '@/lib/api/server';
import { requireAdmin } from '@/lib/auth/session';
import { optionalText, type ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';

const NO_PARENT = 'none';

export async function saveCategory(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/categories');

  const id = optionalText(formData, 'id');
  const parentId = optionalText(formData, 'parentId');
  const parsed = categoryInputSchema.safeParse({
    name: formData.get('name'),
    slug: optionalText(formData, 'slug'),
    description: optionalText(formData, 'description') ?? null,
    parentId: !parentId || parentId === NO_PARENT ? null : parentId,
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await apiRequest(
      id ? `/api/v1/admin/categories/${encodeURIComponent(id)}` : '/api/v1/admin/categories',
      categorySchema,
      { method: id ? 'PATCH' : 'POST', body: parsed.data },
    );
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}

export async function deleteCategory(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/categories');

  try {
    await apiCommand(`/api/v1/admin/categories/${encodeURIComponent(String(formData.get('id')))}`, {
      method: 'DELETE',
    });
  } catch (error) {
    return apiErrorState(error, formData, { 409: 'Move or delete its sub-categories first.' });
  }

  refresh();
  return { status: 'success' };
}
