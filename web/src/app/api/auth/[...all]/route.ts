import type { NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';

/**
 * Forwards /api/auth/* to the API, where Better Auth runs. Going through the web
 * origin keeps auth cookies first-party: the browser never talks to the API
 * directly, so there is no cross-site cookie or CORS setup to get wrong.
 */
async function forward(request: NextRequest): Promise<Response> {
  const { API_URL } = getServerEnv();
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, API_URL);

  const headers = new Headers(request.headers);
  // Let fetch set these for the upstream connection.
  for (const name of ['host', 'connection', 'content-length']) headers.delete(name);

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });

  // fetch already decoded the body, so the original encoding headers no longer apply.
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { forward as GET, forward as POST };
