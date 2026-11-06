import { Module } from '@nestjs/common';
import { CategoriesController } from './categories/categories.controller.js';
import { CategoriesService } from './categories/categories.service.js';
import { OptionsController } from './options/options.controller.js';
import { OptionsService } from './options/options.service.js';
import { ImagesController } from './products/images.controller.js';
import { ImagesService } from './products/images.service.js';
import { ProductsController } from './products/products.controller.js';
import { ProductsService } from './products/products.service.js';
import { VariantsController } from './products/variants.controller.js';
import { VariantsService } from './products/variants.service.js';

@Module({
  controllers: [
    CategoriesController,
    OptionsController,
    ProductsController,
    VariantsController,
    ImagesController,
  ],
  providers: [CategoriesService, OptionsService, ProductsService, VariantsService, ImagesService],
})
export class CatalogModule {}
