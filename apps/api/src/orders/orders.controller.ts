import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ADMIN_ROLE,
  checkoutSchema,
  orderListQuerySchema,
  orderStatusUpdateSchema,
  type Checkout,
  type Order,
  type OrderList,
  type OrderListQuery,
  type OrderStatusUpdate,
} from '@repo/shared';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { OrdersService } from './orders.service.js';

/** Checkout and the signed-in customer's own orders. Requires a session. */
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Places an order from the customer's cart. */
  @Post('checkout')
  checkout(
    @Session() session: UserSession<Auth>,
    @Body(new ZodValidationPipe(checkoutSchema)) input: Checkout,
  ): Promise<Order> {
    return this.orders.checkout({ id: session.user.id, email: session.user.email }, input);
  }

  @Get('orders')
  list(
    @Session() session: UserSession<Auth>,
    @Query(new ZodValidationPipe(orderListQuerySchema)) query: OrderListQuery,
  ): Promise<OrderList> {
    return this.orders.listMine(session.user.id, query);
  }

  @Get('orders/:number')
  find(
    @Session() session: UserSession<Auth>,
    @Param('number', ParseIntPipe) number: number,
  ): Promise<Order> {
    return this.orders.findMine(session.user.id, number);
  }
}

@Roles([ADMIN_ROLE])
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(orderListQuerySchema)) query: OrderListQuery,
  ): Promise<OrderList> {
    return this.orders.listAll(query);
  }

  @Get(':number')
  find(@Param('number', ParseIntPipe) number: number): Promise<Order> {
    return this.orders.findAny(number);
  }

  @Patch(':number')
  update(
    @Param('number', ParseIntPipe) number: number,
    @Body(new ZodValidationPipe(orderStatusUpdateSchema)) { status }: OrderStatusUpdate,
  ): Promise<Order> {
    return this.orders.updateStatus(number, status);
  }
}
