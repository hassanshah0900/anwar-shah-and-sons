import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import {
  ADMIN_ROLE,
  variantInputSchema,
  variantUpdateSchema,
  type Product,
  type VariantInput,
  type VariantUpdate,
} from '@repo/shared';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { VariantsService } from './variants.service.js';

/** Variant changes answer with the whole product so clients can re-render it. */
@Roles([ADMIN_ROLE])
@Controller('admin/products/:productId/variants')
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Post()
  create(
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(variantInputSchema)) input: VariantInput,
  ): Promise<Product> {
    return this.variants.create(productId, input);
  }

  @Post('generate')
  generate(@Param('productId') productId: string): Promise<Product> {
    return this.variants.generate(productId);
  }

  @Patch(':variantId')
  update(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body(new ZodValidationPipe(variantUpdateSchema)) input: VariantUpdate,
  ): Promise<Product> {
    return this.variants.update(productId, variantId, input);
  }

  @Delete(':variantId')
  remove(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ): Promise<Product> {
    return this.variants.remove(productId, variantId);
  }
}
