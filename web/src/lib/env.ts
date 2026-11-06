import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  /** Base URL of the NestJS API, reachable from the Next.js server. */
  API_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Validated server-side environment. Read lazily, at request time, so the
 * same build can run against different APIs (local, staging, production).
 */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    const result = serverEnvSchema.safeParse(process.env);

    if (!result.success) {
      throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
    }

    cached = result.data;
  }

  return cached;
}
