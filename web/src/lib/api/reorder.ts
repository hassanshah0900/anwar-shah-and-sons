import 'server-only';
import { refresh } from 'next/cache';
import type { ReorderResult } from '@/components/admin/sortable-list';
import { ApiError, apiCommand } from './server';

/** Sends a list's new order to one of the API's PUT …/order endpoints. */
export async function saveOrder(path: string, body: object): Promise<ReorderResult> {
  try {
    await apiCommand(path, { method: 'PUT', body });
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) return { error: error.message };
    throw error;
  }
  refresh();
}
