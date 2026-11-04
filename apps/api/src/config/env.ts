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
  /** IANA time zone the store works in; the admin dashboard's "today" follows it. */
  STORE_TIMEZONE: z
    .string()
    .refine(isSupportedTimeZone, 'Use an IANA time zone such as Asia/Karachi')
    .default('Asia/Karachi'),
  /** Shipping charged per order, in major units of STORE_CURRENCY (e.g. 250 for Rs 250). */
  SHIPPING_FLAT_RATE: z.coerce.number().nonnegative().default(0),
  /** Orders at or above this subtotal (major units) ship free. Leave unset for no offer. */
  FREE_SHIPPING_OVER: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
  /** How email is sent: "log" prints it (development), "smtp" sends it (e.g. AWS SES SMTP). */
  EMAIL_DRIVER: z.enum(['log', 'smtp']).default('log'),
  /** Sender shown to customers, e.g. "Anwar Shah & Sons <orders@example.com>". */
  EMAIL_FROM: z.string().min(3).default('Anwar Shah & Sons <no-reply@localhost>'),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  /** true for implicit TLS (usually port 465); STARTTLS is used otherwise. */
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
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
  const require = (keys: readonly (keyof Env)[], reason: string) => {
    for (const key of keys) {
      if (!env[key])
        ctx.addIssue({ code: 'custom', path: [key], message: `Required when ${reason}` });
    }
  };
  if (env.STORAGE_DRIVER === 's3') require(['S3_BUCKET', 'S3_REGION'], 'STORAGE_DRIVER=s3');
  if (env.EMAIL_DRIVER === 'smtp') require(['SMTP_HOST'], 'EMAIL_DRIVER=smtp');
});

function isSupportedCurrency(code: string): boolean {
  return Intl.supportedValuesOf('currency').includes(code);
}

function isSupportedTimeZone(timeZone: string): boolean {
  return Intl.supportedValuesOf('timeZone').includes(timeZone) || timeZone === 'UTC';
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
