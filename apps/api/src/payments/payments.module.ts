import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PaymentGateway, UnavailablePaymentGateway } from './payment-gateway.js';
import { StripeGateway } from './stripe-gateway.js';

/** Provides PaymentGateway: Stripe when STRIPE_SECRET_KEY is set. */
@Module({
  providers: [
    {
      provide: PaymentGateway,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): PaymentGateway => {
        const key = config.get('STRIPE_SECRET_KEY', { infer: true });
        return key
          ? new StripeGateway(key, config.get('STRIPE_WEBHOOK_SECRET', { infer: true }))
          : new UnavailablePaymentGateway();
      },
    },
  ],
  exports: [PaymentGateway],
})
export class PaymentsModule {}
