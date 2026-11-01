import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.url(),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Signs and encrypts auth cookies and tokens. Generate with: openssl rand -base64 32 */
  BETTER_AUTH_SECRET: z.string().min(32, 'Use at least 32 characters'),
  /** Public URL of the web app, which proxies /api/auth/* to this API. */
  BETTER_AUTH_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates `process.env` at startup so a misconfigured deployment fails
 * immediately with a readable message instead of at the first request.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
