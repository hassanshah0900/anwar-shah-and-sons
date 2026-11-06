import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { SkipOriginCheck } from '../common/origin.guard.js';
import { PaymentGateway } from '../payments/payment-gateway.js';
import { OrdersService } from './orders.service.js';

/**
 * Stripe's calls about payments. The signature proves they're from Stripe. A
 * failure here answers 500, which makes Stripe try again later.
 */
@AllowAnonymous()
@SkipOriginCheck()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly orders: OrdersService,
  ) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    let sessionId: string | null;
    try {
      sessionId = this.gateway.parseWebhook(request.rawBody ?? Buffer.alloc(0), signature ?? '');
    } catch {
      throw new BadRequestException('Invalid webhook');
    }
    if (sessionId) await this.orders.syncPayment(sessionId);
    return { received: true };
  }
}
