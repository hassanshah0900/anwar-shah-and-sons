import { Injectable, Logger } from '@nestjs/common';
import type { HealthResponse } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service.js';

type CheckStatus = HealthResponse['checks'][string]['status'];

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const database = await this.checkDatabase();

    return {
      status: database === 'up' ? 'ok' : 'error',
      checks: { database: { status: database } },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<CheckStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      this.logger.warn(`Database health check failed: ${String(error)}`);
      return 'down';
    }
  }
}
