import { ADMIN_ROLE, DEFAULT_ROLE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@repo/shared';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import type { Env } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';

type AuthEnv = Pick<Env, 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL' | 'CORS_ORIGIN'>;

/**
 * Builds the Better Auth instance. Kept as a factory so the Nest module, the
 * seed script and tests all create it the same way from their own Prisma client.
 */
export function createAuth(prisma: PrismaClient, env: AuthEnv) {
  return betterAuth({
    appName: 'Anwar Shah & Sons',
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    // Requests that change state must come from the web app (CSRF protection).
    trustedOrigins: [env.CORS_ORIGIN],
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
    },
    plugins: [admin({ defaultRole: DEFAULT_ROLE, adminRoles: [ADMIN_ROLE] })],
    advanced: {
      // The web app proxies auth requests, so the client IP arrives in this header.
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
