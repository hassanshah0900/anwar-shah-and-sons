import { Controller, Get, Header } from '@nestjs/common';
import { ADMIN_ROLE, type Dashboard } from '@repo/shared';
import { Roles } from '@thallesp/nestjs-better-auth';
import { DashboardService } from './dashboard.service.js';

@Roles([ADMIN_ROLE])
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  overview(): Promise<Dashboard> {
    return this.dashboard.overview();
  }
}
