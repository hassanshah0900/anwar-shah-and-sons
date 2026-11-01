import 'server-only';
import { headers } from 'next/headers';
import { userListSchema, type UserList } from '@repo/shared';
import { getServerEnv } from '@/lib/env';

/**
 * Lists users for the admin area. Forwards the visitor's session cookie, so the
 * API enforces the admin role itself; callers should still check it first.
 */
export async function getUsers(): Promise<UserList> {
  const { API_URL } = getServerEnv();
  const cookie = (await headers()).get('cookie') ?? '';

  const response = await fetch(new URL('/api/v1/users', API_URL), {
    headers: { cookie },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to load users (HTTP ${response.status})`);
  }

  return userListSchema.parse(await response.json());
}
