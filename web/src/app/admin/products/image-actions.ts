'use server';

import { refresh } from 'next/cache';
import { productImageUpdateSchema, productSchema } from '@repo/shared';
import { apiRequest } from '@/lib/api/server';
import { requireAdmin } from '@/lib/auth/session';
import { optionalText, type ActionState } from '@/lib/forms/action-state';
import { apiErrorState, validationState } from '@/lib/forms/server';

/** The "Shows for" select sends "all" for images that apply to every option. */
const optionValueFrom = (formData: FormData) => {
  const value = optionalText(formData, 'optionValueId');
  return value && value !== 'all' ? value : null;
};

const imagesPath = (formData: FormData) =>
  `/api/v1/admin/products/${encodeURIComponent(String(formData.get('productId')))}/images`;
const imagePath = (formData: FormData, field = 'imageId') =>
  `${imagesPath(formData)}/${encodeURIComponent(String(formData.get(field)))}`;

export async function uploadImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', fieldErrors: { file: 'Choose an image to upload' } };
  }

  const upload = new FormData();
  upload.set('file', file, file.name);
  upload.set('alt', optionalText(formData, 'alt') ?? '');
  upload.set('optionValueId', optionValueFrom(formData) ?? '');

  try {
    await apiRequest(imagesPath(formData), productSchema, { method: 'POST', body: upload });
  } catch (error) {
    return apiErrorState(error, formData, { 413: 'Use an image of at most 5 MB' });
  }

  refresh();
  return { status: 'success', message: 'Image uploaded' };
}

export async function updateImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');

  const parsed = productImageUpdateSchema.safeParse({
    alt: formData.get('alt') ?? '',
    optionValueId: optionValueFrom(formData),
  });
  if (!parsed.success) return validationState(parsed.error, formData);

  try {
    await apiRequest(imagePath(formData), productSchema, { method: 'PATCH', body: parsed.data });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success', message: 'Saved' };
}

/** Swaps an image's position with its neighbour's. */
export async function moveImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');

  try {
    await apiRequest(imagePath(formData), productSchema, {
      method: 'PATCH',
      body: { position: Number(formData.get('neighbourPosition')) },
    });
    await apiRequest(imagePath(formData, 'neighbourId'), productSchema, {
      method: 'PATCH',
      body: { position: Number(formData.get('position')) },
    });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}

export async function deleteImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin('/admin/products');

  try {
    await apiRequest(imagePath(formData), productSchema, { method: 'DELETE' });
  } catch (error) {
    return apiErrorState(error, formData);
  }

  refresh();
  return { status: 'success' };
}
