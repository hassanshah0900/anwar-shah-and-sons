import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HealthResponse } from '@repo/shared';
import { getApiHealth } from './health';

const healthy: HealthResponse = {
  status: 'ok',
  checks: { database: { status: 'up' } },
  timestamp: '2026-01-01T00:00:00.000Z',
};

function stubFetch(impl: typeof fetch) {
  const fetchMock = vi.fn<typeof fetch>(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('getApiHealth', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'http://api.test');
  });

  it('calls the health endpoint on the configured API', async () => {
    const fetchMock = stubFetch(async () => Response.json(healthy));

    await getApiHealth();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://api.test/api/health');
  });

  it('returns the parsed health when the API is up', async () => {
    stubFetch(async () => Response.json(healthy));

    await expect(getApiHealth()).resolves.toEqual({ reachable: true, health: healthy });
  });

  it('still parses the body of a 503 response', async () => {
    const degraded: HealthResponse = {
      ...healthy,
      status: 'error',
      checks: { database: { status: 'down' } },
    };
    stubFetch(async () => Response.json(degraded, { status: 503 }));

    await expect(getApiHealth()).resolves.toEqual({ reachable: true, health: degraded });
  });

  it('reports the API as unreachable when the request fails', async () => {
    stubFetch(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(getApiHealth()).resolves.toEqual({ reachable: false, reason: 'fetch failed' });
  });

  it('reports the API as unreachable when the body breaks the contract', async () => {
    stubFetch(async () => Response.json({ hello: 'world' }, { status: 200 }));

    await expect(getApiHealth()).resolves.toEqual({
      reachable: false,
      reason: 'Unexpected response (HTTP 200)',
    });
  });
});
