import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { ADMIN_ROLE, sessionUserSchema, type SessionUser } from '@repo/shared';
import { getServerEnv } from '@/lib/env';
import { signInUrl } from './redirect';

/**
 * The signed-in user, or null. Data Access Layer for auth: every server-side
 * session check goes through here. Reads the request, so callers must render
 * inside <Suspense>. Memoised per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = (await headers()).get('cookie');
  if (!cookie) return null;

  const { API_URL } = getServerEnv();
  const response = await fetch(new URL('/api/auth/get-session', API_URL), {
    headers: { cookie },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;

  const body: unknown = await response.json();
  const user = sessionUserSchema.safeParse((body as { user?: unknown } | null)?.user);
  return user.success ? user.data : null;
});

/** The signed-in user; anyone else is sent to sign in and brought back to `returnTo`. */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(signInUrl(returnTo));
  return user;
}

/** An admin; other signed-in users get a 404 so the admin area isn't revealed. */
export async function requireAdmin(returnTo: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role !== ADMIN_ROLE) notFound();
  return user;
}
