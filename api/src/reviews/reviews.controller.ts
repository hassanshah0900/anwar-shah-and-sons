import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ADMIN_ROLE,
  reviewInputSchema,
  reviewListQuerySchema,
  type Review,
  type ReviewEligibility,
  type ReviewHighlights,
  type ReviewInput,
  type ReviewList,
  type ReviewListQuery,
} from '@repo/shared';
import { AllowAnonymous, Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Auth } from '../auth/auth.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ReviewsService } from './reviews.service.js';

/** Reviews change rarely; a short shared cache keeps product pages quick. */
const REVIEWS_CACHE = 'public, max-age=60, stale-while-revalidate=300';
const MAX_HIGHLIGHTS = 12;

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @AllowAnonymous()
  @Get('products/:slug/reviews')
  @Header('Cache-Control', REVIEWS_CACHE)
  list(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(reviewListQuerySchema)) query: ReviewListQuery,
  ): Promise<ReviewList> {
    return this.reviews.list(slug, query);
  }

  /** Whether the signed-in customer may review the product. */
  @Get('products/:slug/reviews/eligibility')
  eligibility(
    @Session() session: UserSession<Auth>,
    @Param('slug') slug: string,
  ): Promise<ReviewEligibility> {
    return this.reviews.eligibility(slug, session.user.id);
  }

  @Post('products/:slug/reviews')
  create(
    @Session() session: UserSession<Auth>,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(reviewInputSchema)) input: ReviewInput,
  ): Promise<Review> {
    return this.reviews.create(slug, session.user.id, input);
  }

  @AllowAnonymous()
  @Get('reviews/highlights')
  @Header('Cache-Control', REVIEWS_CACHE)
  highlights(
    @Query('limit', new DefaultValuePipe(3), ParseIntPipe) limit: number,
  ): Promise<ReviewHighlights> {
    return this.reviews.highlights(Math.min(Math.max(limit, 1), MAX_HIGHLIGHTS));
  }

  @Roles([ADMIN_ROLE])
  @Delete('admin/reviews/:id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.reviews.remove(id);
  }
}
