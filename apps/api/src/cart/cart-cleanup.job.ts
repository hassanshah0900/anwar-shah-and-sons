import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Env } from '../config/env.js';
import { CartService } from './cart.service.js';

const DAY_MS = 86_400_000;

/**
 * Deletes abandoned guest carts once a day (03:00 UTC). Each API instance runs
 * it; that's harmless, since deleting the same old carts twice changes nothing.
 */
@Injectable()
export class CartCleanupJob {
  private readonly logger = new Logger(CartCleanupJob.name);

  constructor(
    private readonly carts: CartService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'guest-cart-cleanup', timeZone: 'UTC' })
  async run(now = new Date()): Promise<number> {
    const days = this.config.get('GUEST_CART_TTL_DAYS', { infer: true });
    const deleted = await this.carts.deleteStaleGuestCarts(new Date(now.getTime() - days * DAY_MS));
    if (deleted > 0) this.logger.log(`Deleted ${deleted} guest carts unused for ${days} days`);
    return deleted;
  }
}
