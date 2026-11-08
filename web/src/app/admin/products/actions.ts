'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { productInputSchema, productSchema, productUpdateSchema } from '@repo/shared';
import { apiCommand, apiRequest } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { saveOrder } from '@/lib/api/reorder';
import { requireAdmin } from '@/lib/auth/session';
import { optionalText, type ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';
import { parsePrice } from '@/lib/money';

const BASE = '/api/v1/admin/products';

async function productFields(formData: FormData) {
  const { currency } = await getStoreConfig();
  return {
    name: formData.get('name'),
    slug: optionalText(formData, 'slug'),
    description: optionalText(formData, 'description') ?? null,
    categoryId: formData.get('categoryId') ?? '',
    status: formData.get('status') ?? undefined,
    price: parsePrice(formData.get('price'), currency),
    compareAtPrice: parsePrice(formData.get('compareAtPrice'), currency) ?? null,
    optionTypeIds: formData.getAll('optionTypeIds').map(String),
  };
}

export async function createProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products/new');

  const parsed = productInputSchema.safeParse(await productFields(formData));
  if (!parsed.success) return validationState(parsed.error, formData);

  let id: string;
  try {
    id = (await apiRequest(BASE, productSchema, { method: 'POST', body: parsed.data })).id;
  } catch (error) {
    return apiErrorState(error, formData);
  }

  // Continue on the edit page, where variants are added.
  redirect(`/admin/products/${id}`);
}

export async function updateProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id'));
  await requireAdmin(`/admin/products/${id}`);

  const fields = await productFields(formData);
  // Options are locked once variants exist, so the form omits them; don't clear them.
  const parsed = productUpdateSchema.safeParse(
    formData.has('optionsLocked') ? { ...fields, optionTypeIds: undefined } : fields,
  );
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await apiRequest(`${BASE}/${encodeURIComponent(id)}`, productSchema, {
      method: 'PATCH',
      body: parsed.data,
    });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success', message: 'Product saved' };
}

export async function deleteProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');

  try {
    await apiCommand(`${BASE}/${encodeURIComponent(String(formData.get('id')))}`, {
      method: 'DELETE',
    });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  redirect('/admin/products');
}

/** The order shoppers see the product's options in, e.g. Colour before Size. */
export async function reorderProductOptions(productId: string, optionTypeIds: string[]) {
  await requireAdmin(`/admin/products/${productId}`);
  return saveOrder(`${BASE}/${encodeURIComponent(productId)}/options/order`, {
    ids: optionTypeIds,
  });
}
