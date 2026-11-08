import 'server-only';
import { headers } from 'next/headers';
import type { z } from 'zod';
import { getServerEnv } from '@/lib/env';

export type ApiIssue = { path: string; message: string };

/** An error response from the API, with validation issues when there are any. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serialisable data, or FormData for multipart uploads. */
  body?: unknown;
  /** Extra request headers, such as the guest cart token. */
  headers?: Record<string, string>;
};

/**
 * Calls the API on behalf of the current visitor: forwards their session cookie,
 * and on writes their Origin (already checked by Next for Server Actions) so the
 * API's CSRF guard accepts it. Responses are validated with `schema`.
 */
export async function apiRequest<T extends z.ZodType>(
  path: string,
  schema: T,
  { method = 'GET', body, headers }: ApiRequest = {},
): Promise<z.output<T>> {
  const response = await send(path, method, body, headers);
  return schema.parse(await response.json());
}

/** Like apiRequest, for endpoints that answer 204 No Content. */
export async function apiCommand(
  path: string,
  { method = 'POST', body, headers }: ApiRequest = {},
) {
  await send(path, method, body, headers);
}

async function send(
  path: string,
  method: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  // Read the request first: during a build this defers the page to request time,
  // so builds never need API_URL (or the API) to be available.
  const incoming = await headers();
  const { API_URL } = getServerEnv();

  const outgoing = new Headers({ ...extraHeaders, cookie: incoming.get('cookie') ?? '' });
  const origin = incoming.get('origin');
  if (method !== 'GET' && origin) outgoing.set('origin', origin);
  // FormData (file uploads) sets its own multipart content type and boundary.
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) outgoing.set('content-type', 'application/json');

  const response = await fetch(new URL(path, API_URL), {
    method,
    headers: outgoing,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(isForm ? 30_000 : 10_000),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
      issues?: ApiIssue[];
    };
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new ApiError(
      response.status,
      message ?? `Request failed (HTTP ${response.status})`,
      error.issues,
    );
  }

  return response;
}
