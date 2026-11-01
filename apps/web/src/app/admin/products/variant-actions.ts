'use server';

import { refresh } from 'next/cache';
import { productSchema, variantInputSchema, variantUpdateSchema } from '@repo/shared';
import { apiRequest } from '@/lib/api/server';
import { getStoreConfig } from '@/lib/api/store';
import { requireAdmin } from '@/lib/auth/session';
import type { ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';
import { parsePrice } from '@/lib/money';

const variantsPath = (formData: FormData) =>
  `/api/v1/admin/products/${encodeURIComponent(String(formData.get('productId')))}/variants`;

/** Stock as typed: blank means not given, anything else must be a whole number. */
function parseStock(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
}

export async function addVariant(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');
  const { currency } = await getStoreConfig();

  const parsed = variantInputSchema.safeParse({
    sku: formData.get('sku'),
    price: parsePrice(formData.get('price'), currency) ?? null,
    stock: parseStock(formData.get('stock')),
    optionValueIds: formData.getAll('optionValueIds').map(String).filter(Boolean),
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await apiRequest(variantsPath(formData), productSchema, { method: 'POST', body: parsed.data });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}

export async function saveVariant(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');
  const { currency } = await getStoreConfig();

  const parsed = variantUpdateSchema.safeParse({
    sku: formData.get('sku'),
    // A blank override clears it, so the product price applies.
    price: parsePrice(formData.get('price'), currency) ?? null,
    stock: parseStock(formData.get('stock')) ?? 0,
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await apiRequest(
      `${variantsPath(formData)}/${encodeURIComponent(String(formData.get('variantId')))}`,
      productSchema,
      { method: 'PATCH', body: parsed.data },
    );
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success', message: 'Saved' };
}

export async function deleteVariant(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');

  try {
    await apiRequest(
      `${variantsPath(formData)}/${encodeURIComponent(String(formData.get('variantId')))}`,
      productSchema,
      { method: 'DELETE' },
    );
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}

export async function generateVariants(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin('/admin/products');

  try {
    await apiRequest(`${variantsPath(formData)}/generate`, productSchema, {
      method: 'POST',
      body: {},
    });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}
