import { Module } from '@nestjs/common';
import { CategoriesController } from './categories/categories.controller.js';
import { CategoriesService } from './categories/categories.service.js';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CatalogModule {}
