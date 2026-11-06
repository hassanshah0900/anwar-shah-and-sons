import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  productListingQuerySchema,
  type CategoryList,
  type ProductDetail,
  type ProductListing,
  type ProductListingQuery,
} from '@repo/shared';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { StorefrontService } from './storefront.service.js';

/** Shared caches may keep catalog responses briefly; admin edits show within a minute. */
const CATALOG_CACHE = 'public, max-age=60, stale-while-revalidate=300';

@AllowAnonymous()
@Controller()
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get('categories')
  @Header('Cache-Control', CATALOG_CACHE)
  async categories(): Promise<CategoryList> {
    return { categories: await this.storefront.categories() };
  }

  @Get('products')
  @Header('Cache-Control', CATALOG_CACHE)
  products(
    @Query(new ZodValidationPipe(productListingQuerySchema)) query: ProductListingQuery,
  ): Promise<ProductListing> {
    return this.storefront.listProducts(query);
  }

  @Get('products/:slug')
  @Header('Cache-Control', CATALOG_CACHE)
  product(@Param('slug') slug: string): Promise<ProductDetail> {
    return this.storefront.product(slug);
  }
}
