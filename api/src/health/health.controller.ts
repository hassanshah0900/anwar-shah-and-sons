import { Controller, Get, ServiceUnavailableException, VERSION_NEUTRAL } from '@nestjs/common';
import type { HealthResponse } from '@repo/shared';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { HealthService } from './health.service.js';

@AllowAnonymous()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Responds 200 when every dependency is up and 503 otherwise, for load balancer checks. */
  @Get()
  async check(): Promise<HealthResponse> {
    const result = await this.healthService.check();

    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
