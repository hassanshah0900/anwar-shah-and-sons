import 'server-only';
import { healthResponseSchema, type HealthResponse } from '@repo/shared';
import { getServerEnv } from '../env';

export type ApiHealth =
  | { reachable: true; health: HealthResponse }
  | { reachable: false; reason: string };

/**
 * Fetches the API health check. The API answers 503 with the same body when a
 * dependency is down, so the body is parsed regardless of the status code.
 */
export async function getApiHealth(): Promise<ApiHealth> {
  const { API_URL } = getServerEnv();

  try {
    const response = await fetch(new URL('/api/health', API_URL), {
      signal: AbortSignal.timeout(5_000),
    });
    const parsed = healthResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      return { reachable: false, reason: `Unexpected response (HTTP ${response.status})` };
    }

    return { reachable: true, health: parsed.data };
  } catch (error) {
    return { reachable: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
