import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ADMIN_ROLE,
  productInputSchema,
  productListQuerySchema,
  productUpdateSchema,
  type Product,
  type ProductInput,
  type ProductList,
  type ProductListQuery,
  type ProductUpdate,
} from '@repo/shared';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ProductsService } from './products.service.js';

@Roles([ADMIN_ROLE])
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(productListQuerySchema)) query: ProductListQuery,
  ): Promise<ProductList> {
    return this.products.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<Product> {
    return this.products.get(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(productInputSchema)) input: ProductInput): Promise<Product> {
    return this.products.create(input);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(productUpdateSchema)) input: ProductUpdate,
  ): Promise<Product> {
    return this.products.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.products.remove(id);
  }
}
