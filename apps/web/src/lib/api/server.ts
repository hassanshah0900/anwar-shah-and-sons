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
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
};

/**
 * Calls the API on behalf of the current visitor: forwards their session cookie,
 * and on writes their Origin (already checked by Next for Server Actions) so the
 * API's CSRF guard accepts it. Responses are validated with `schema`.
 */
export async function apiRequest<T extends z.ZodType>(
  path: string,
  schema: T,
  { method = 'GET', body }: ApiRequest = {},
): Promise<z.output<T>> {
  const response = await send(path, method, body);
  return schema.parse(await response.json());
}

/** Like apiRequest, for endpoints that answer 204 No Content. */
export async function apiCommand(path: string, { method = 'POST', body }: ApiRequest = {}) {
  await send(path, method, body);
}

async function send(path: string, method: string, body: unknown): Promise<Response> {
  const { API_URL } = getServerEnv();
  const incoming = await headers();

  const outgoing = new Headers({ cookie: incoming.get('cookie') ?? '' });
  const origin = incoming.get('origin');
  if (method !== 'GET' && origin) outgoing.set('origin', origin);
  if (body !== undefined) outgoing.set('content-type', 'application/json');

  const response = await fetch(new URL(path, API_URL), {
    method,
    headers: outgoing,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
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
