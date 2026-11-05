import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Env } from '../config/env.js';
import { OrdersService } from './orders.service.js';

const MINUTE_MS = 60_000;

/**
 * A safety net for missed webhooks: without it, an unpaid order whose webhook
 * never came would hold its stock forever. Safe on several instances, since
 * settling an order twice changes nothing.
 */
@Injectable()
export class OrderPaymentsJob {
  private readonly logger = new Logger(OrderPaymentsJob.name);

  constructor(
    private readonly orders: OrdersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'order-payments' })
  async run(now = new Date()): Promise<number> {
    if (!this.config.get('STRIPE_SECRET_KEY', { infer: true })) return 0;

    const minutes = this.config.get('PAYMENT_WINDOW_MINUTES', { infer: true }) + 5;
    const checked = await this.orders.settleOverdue(new Date(now.getTime() - minutes * MINUTE_MS));
    if (checked > 0) this.logger.log(`Checked ${checked} overdue unpaid orders`);
    return checked;
  }
}
