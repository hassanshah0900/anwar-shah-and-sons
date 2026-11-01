import { Module } from '@nestjs/common';
import { CategoriesController } from './categories/categories.controller.js';
import { CategoriesService } from './categories/categories.service.js';
import { OptionsController } from './options/options.controller.js';
import { OptionsService } from './options/options.service.js';

@Module({
  controllers: [CategoriesController, OptionsController],
  providers: [CategoriesService, OptionsService],
})
export class CatalogModule {}
