import { ADMIN_ROLE, DEFAULT_ROLE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@repo/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins/admin';
import type { Env } from '../config/env.js';
import type { Database } from '../db/connection.js';
import { accounts, sessions, users, verifications } from '../db/schema/index.js';
import type { Mailer } from '../mail/mailer.js';
import { passwordResetEmail } from '../mail/templates.js';

type AuthEnv = Pick<Env, 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL' | 'CORS_ORIGIN'>;

/**
 * Builds the Better Auth instance. Kept as a factory so the Nest module, the
 * seed script and tests all create it the same way from their own database client.
 */
export function createAuth(db: Database, env: AuthEnv, mailer?: Mailer) {
  return betterAuth({
    appName: 'Anwar Shah & Sons',
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    // Requests that change state must come from the web app (CSRF protection).
    trustedOrigins: [env.CORS_ORIGIN],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      // Password reset needs email; scripts that build auth without a mailer don't offer it.
      ...(mailer && {
        resetPasswordTokenExpiresIn: 60 * 60,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({
          user,
          url,
        }: {
          user: { email: string; name: string };
          url: string;
        }) => {
          // Not awaited: a slow mail server mustn't hold the request open, and the
          // response time mustn't hint at whether the address has an account.
          void mailer
            .send({ to: user.email, ...passwordResetEmail({ name: user.name, url }) })
            .catch((error: unknown) => console.error('Password reset email failed', error));
        },
      }),
    },
    plugins: [admin({ defaultRole: DEFAULT_ROLE, adminRoles: [ADMIN_ROLE] })],
    advanced: {
      // Better Auth skips the origin (CSRF) check when NODE_ENV=test; keep it on
      // everywhere so tests exercise the same protection as production.
      disableOriginCheck: false,
      // The web app proxies auth requests, so the client IP arrives in this header.
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
