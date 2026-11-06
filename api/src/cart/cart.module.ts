import { Module } from '@nestjs/common';
import { CartCleanupJob } from './cart-cleanup.job.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

@Module({ controllers: [CartController], providers: [CartService, CartCleanupJob] })
export class CartModule {}
