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
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const reviewSelect = {
  id: true,
  rating: true,
  title: true,
  body: true,
  createdAt: true,
  user: { select: { name: true } },
} satisfies Prisma.ReviewSelect;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

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
  constructor(private readonly prisma: PrismaService) {}

  /** A page of an active product's reviews, newest first, with the rating spread. */
  async list(slug: string, query: ReviewListQuery): Promise<ReviewList> {
    const productId = await this.activeProductId(slug);
    const [rows, total, counts] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        select: reviewSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.pageSize,
        skip: (query.page - 1) * query.pageSize,
      }),
      this.prisma.review.count({ where: { productId } }),
      this.prisma.review.groupBy({ by: ['rating'], where: { productId }, _count: true }),
    ]);
    const byRating = new Map(counts.map((count) => [count.rating, count._count]));

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
      const row = await this.prisma.review.create({
        data: {
          productId,
          userId,
          rating: data.rating,
          title: data.title ?? null,
          body: data.body,
        },
        select: reviewSelect,
      });
      return toReview(row);
    } catch (error) {
      // Two submissions at once: the unique index lets only one through.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product.');
      }
      throw error;
    }
  }

  /** Recent four- and five-star reviews with written text, one per product. */
  async highlights(limit: number): Promise<ReviewHighlights> {
    const rows = await this.prisma.review.findMany({
      where: { rating: { gte: 4 }, product: { status: 'active' } },
      select: {
        ...reviewSelect,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              select: { storageKey: true, alt: true },
              orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
              take: 1,
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit * 5,
    });

    const seen = new Set<string>();
    const reviews = rows
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
    return { reviews };
  }

  /** Admins can take down a review; the product's rating follows. */
  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.review.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException('Review not found');
  }

  private async check(productId: string, userId: string): Promise<ReviewEligibility> {
    const [existing, delivered] = await Promise.all([
      this.prisma.review.findUnique({
        where: { productId_userId: { productId, userId } },
        select: { id: true },
      }),
      this.prisma.orderItem.findFirst({
        where: { productId, order: { userId, status: 'delivered' } },
        select: { id: true },
      }),
    ]);
    if (existing) return { canReview: false, reason: 'already-reviewed' };
    if (!delivered) return { canReview: false, reason: 'not-purchased' };
    return { canReview: true, reason: null };
  }

  private async activeProductId(slug: string): Promise<string> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'active' },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product.id;
  }
}
