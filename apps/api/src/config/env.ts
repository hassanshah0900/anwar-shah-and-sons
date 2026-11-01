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
  /** ISO 4217 currency for all prices. Changing it does not convert existing prices. */
  STORE_CURRENCY: z
    .string()
    .length(3)
    .toUpperCase()
    .refine(isSupportedCurrency, 'Use an ISO 4217 currency code such as PKR')
    .default('PKR'),
  /** BCP 47 locale for formatting prices and dates. */
  STORE_LOCALE: z.string().refine(isSupportedLocale, 'Use a locale such as en-PK').default('en-PK'),
});

export type Env = z.infer<typeof envSchema>;

function isSupportedCurrency(code: string): boolean {
  return Intl.supportedValuesOf('currency').includes(code);
}

function isSupportedLocale(locale: string): boolean {
  try {
    return Intl.NumberFormat.supportedLocalesOf(locale).length > 0;
  } catch {
    return false;
  }
}

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
