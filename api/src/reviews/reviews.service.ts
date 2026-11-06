import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  reviewAuthor,
  reviewInputSchema,
  type Review,
  type ReviewEligibility,
  type ReviewHighlights,
  type ReviewInput,
  type ReviewList,
  type ReviewListQuery,
} from '@repo/shared';
import { and, count, desc, eq, gte, inArray } from 'drizzle-orm';
import type { Database } from '../db/connection.js';
import { InjectDatabase } from '../db/database.module.js';
import { found, isUniqueViolation } from '../db/queries.js';
import { orderItems, orders, products, reviews, users } from '../db/schema/index.js';

const reviewColumns = {
  id: reviews.id,
  rating: reviews.rating,
  title: reviews.title,
  body: reviews.body,
  createdAt: reviews.createdAt,
  user: { name: users.name },
};

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date;
  user: { name: string };
};

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    author: reviewAuthor(row.user.name),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Reviews can only be written by customers who have received the product. */
@Injectable()
export class ReviewsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** A page of an active product's reviews, newest first, with the rating spread. */
  async list(slug: string, query: ReviewListQuery): Promise<ReviewList> {
    const productId = await this.activeProductId(slug);
    const ofProduct = eq(reviews.productId, productId);
    const [rows, total, counts] = await Promise.all([
      this.db
        .select(reviewColumns)
        .from(reviews)
        .innerJoin(users, eq(users.id, reviews.userId))
        .where(ofProduct)
        .orderBy(desc(reviews.createdAt), desc(reviews.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.$count(reviews, ofProduct),
      this.db
        .select({ rating: reviews.rating, count: count() })
        .from(reviews)
        .where(ofProduct)
        .groupBy(reviews.rating),
    ]);
    const byRating = new Map(counts.map((row) => [row.rating, row.count]));

    return {
      reviews: rows.map(toReview),
      total,
      distribution: [5, 4, 3, 2, 1].map((rating) => byRating.get(rating) ?? 0),
    };
  }

  async eligibility(slug: string, userId: string): Promise<ReviewEligibility> {
    const productId = await this.activeProductId(slug);
    return this.check(productId, userId);
  }

  async create(slug: string, userId: string, input: ReviewInput): Promise<Review> {
    const data = reviewInputSchema.parse(input);
    const productId = await this.activeProductId(slug);
    const { reason } = await this.check(productId, userId);
    if (reason === 'not-purchased') {
      throw new ForbiddenException('You can review this once your order has been delivered.');
    }
    if (reason === 'already-reviewed') {
      throw new ConflictException('You have already reviewed this product.');
    }

    try {
      const { id } = found(
        await this.db
          .insert(reviews)
          .values({
            productId,
            userId,
            rating: data.rating,
            title: data.title ?? null,
            body: data.body,
          })
          .returning({ id: reviews.id }),
      );
      return toReview(
        found(
          await this.db
            .select(reviewColumns)
            .from(reviews)
            .innerJoin(users, eq(users.id, reviews.userId))
            .where(eq(reviews.id, id)),
        ),
      );
    } catch (error) {
      // Two submissions at once: the unique index lets only one through.
      if (isUniqueViolation(error)) {
        throw new ConflictException('You have already reviewed this product.');
      }
      throw error;
    }
  }

  /** Recent four- and five-star reviews with written text, one per product. */
  async highlights(limit: number): Promise<ReviewHighlights> {
    const rows = await this.db.query.reviews.findMany({
      where: and(
        gte(reviews.rating, 4),
        // Not correlated: Drizzle's relational queries alias the outer table.
        inArray(
          reviews.productId,
          this.db.select({ id: products.id }).from(products).where(eq(products.status, 'active')),
        ),
      ),
      columns: { id: true, rating: true, title: true, body: true, createdAt: true },
      with: {
        user: { columns: { name: true } },
        product: {
          columns: { id: true, name: true, slug: true },
          with: {
            images: {
              columns: { storageKey: true, alt: true },
              orderBy: (image, { asc }) => [asc(image.position), asc(image.createdAt)],
              limit: 1,
            },
          },
        },
      },
      orderBy: [desc(reviews.createdAt), desc(reviews.id)],
      limit: limit * 5,
    });

    const seen = new Set<string>();
    const picked = rows
      .filter((row) => !seen.has(row.product.id) && seen.add(row.product.id))
      .slice(0, limit)
      .map((row) => {
        const image = row.product.images[0];
        return {
          ...toReview(row),
          product: {
            name: row.product.name,
            slug: row.product.slug,
            image: image ? { key: image.storageKey, alt: image.alt } : null,
          },
        };
      });
    return { reviews: picked };
  }

  /** Admins can take down a review; the product's rating follows. */
  async remove(id: string): Promise<void> {
    const deleted = await this.db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning({ id: reviews.id });
    if (deleted.length === 0) throw new NotFoundException('Review not found');
  }

  private async check(productId: string, userId: string): Promise<ReviewEligibility> {
    const [[existing], [delivered]] = await Promise.all([
      this.db
        .select({ id: reviews.id })
        .from(reviews)
        .where(and(eq(reviews.productId, productId), eq(reviews.userId, userId))),
      this.db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(
          and(
            eq(orderItems.productId, productId),
            eq(orders.userId, userId),
            eq(orders.status, 'delivered'),
          ),
        )
        .limit(1),
    ]);
    if (existing) return { canReview: false, reason: 'already-reviewed' };
    if (!delivered) return { canReview: false, reason: 'not-purchased' };
    return { canReview: true, reason: null };
  }

  private async activeProductId(slug: string): Promise<string> {
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.status, 'active')));
    if (!product) throw new NotFoundException('Product not found');
    return product.id;
  }
}
