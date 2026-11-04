import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module.js';
import { AdminOrdersController, OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [AddressesModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
