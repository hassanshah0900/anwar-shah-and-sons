import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { createPrismaAdapter } from './prisma-adapter.js';

/**
 * The application's single Prisma client (and therefore single connection pool).
 * Connections are opened lazily, so the API can start while the database is down
 * and report it through the health check.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({ adapter: createPrismaAdapter(config.get('DATABASE_URL', { infer: true })) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
