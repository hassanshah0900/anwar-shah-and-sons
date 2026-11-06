import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';
import { signInUrl } from '@/lib/auth/redirect';

/**
 * Optimistic check before rendering: visitors without a session cookie are sent
 * straight to sign in with a real redirect. It only looks for the cookie; pages
 * still validate the session (requireUser/requireAdmin), which is the real check.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(signInUrl(pathname + search), request.url));
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/checkout/:path*'],
};
