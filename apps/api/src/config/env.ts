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
  /** Shipping charged per order, in major units of STORE_CURRENCY (e.g. 250 for Rs 250). */
  SHIPPING_FLAT_RATE: z.coerce.number().nonnegative().default(0),
  /** Orders at or above this subtotal (major units) ship free. Leave unset for no offer. */
  FREE_SHIPPING_OVER: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
  /** Where uploaded media is stored: a local directory or an S3 bucket. */
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  /** Directory for the local driver, relative to the API's working directory. */
  STORAGE_LOCAL_DIR: z.string().min(1).default('uploads'),
  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional(),
  /** Custom endpoint for S3-compatible storage (e.g. MinIO); omit for AWS. */
  S3_ENDPOINT: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

const validatedEnvSchema = envSchema.superRefine((env, ctx) => {
  if (env.STORAGE_DRIVER !== 's3') return;
  for (const key of ['S3_BUCKET', 'S3_REGION'] as const) {
    if (!env[key])
      ctx.addIssue({ code: 'custom', path: [key], message: 'Required when STORAGE_DRIVER=s3' });
  }
});

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
  const result = validatedEnvSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
