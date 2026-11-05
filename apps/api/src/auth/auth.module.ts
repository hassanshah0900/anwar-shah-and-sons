import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import type { Env } from '../config/env.js';
import { Mailer } from '../mail/mailer.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { createAuth } from './auth.js';

/**
 * Mounts Better Auth at /api/auth/* and registers a global guard: every route
 * requires a session unless marked @AllowAnonymous() or @OptionalAuth().
 */
@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      inject: [PrismaService, ConfigService, Mailer],
      useFactory: (prisma: PrismaService, config: ConfigService<Env, true>, mailer: Mailer) => ({
        // Keeps each request's exact bytes too: webhook signatures are checked against them.
        bodyParser: { rawBody: true },
        auth: createAuth(
          prisma,
          {
            BETTER_AUTH_SECRET: config.get('BETTER_AUTH_SECRET', { infer: true }),
            BETTER_AUTH_URL: config.get('BETTER_AUTH_URL', { infer: true }),
            CORS_ORIGIN: config.get('CORS_ORIGIN', { infer: true }),
          },
          mailer,
        ),
      }),
    }),
  ],
})
export class AuthModule {}
