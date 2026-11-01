import type { NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';

const PASS_THROUGH = ['content-type', 'content-length', 'cache-control', 'x-content-type-options'];

/**
 * Serves uploaded media from the web origin by streaming it from the API, so
 * next/image can optimise it as a local image and the storage backend (disk or
 * S3) stays an API detail.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const { API_URL } = getServerEnv();

  const upstream = await fetch(
    new URL(`/api/v1/media/${path.map(encodeURIComponent).join('/')}`, API_URL),
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!upstream.ok) return new Response(null, { status: upstream.status === 404 ? 404 : 502 });

  const headers = new Headers();
  for (const name of PASS_THROUGH) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
