import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ADMIN_ROLE,
  productInputSchema,
  productListQuerySchema,
  productUpdateSchema,
  reorderSchema,
  type Product,
  type ProductInput,
  type ProductList,
  type ProductListQuery,
  type ProductUpdate,
  type Reorder,
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

  /** `ids` are option type ids, in the order shoppers should see them. */
  @Put(':id/options/order')
  reorderOptions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reorderSchema)) { ids }: Reorder,
  ): Promise<Product> {
    return this.products.reorderOptions(id, ids);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.products.remove(id);
  }
}
