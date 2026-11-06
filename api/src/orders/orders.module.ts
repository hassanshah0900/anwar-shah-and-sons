import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { OrderPaymentsJob } from './order-payments.job.js';
import { AdminOrdersController, OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';

@Module({
  imports: [AddressesModule, PaymentsModule],
  controllers: [OrdersController, AdminOrdersController, StripeWebhookController],
  providers: [OrdersService, OrderPaymentsJob],
  exports: [OrdersService],
})
export class OrdersModule {}
