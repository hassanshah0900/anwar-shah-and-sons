import Link from 'next/link';
import { Suspense } from 'react';
import { BadgeCheckIcon } from 'lucide-react';
import { REVIEW_PAGE_SIZE, type ProductDetail, type Review } from '@repo/shared';
import { Pagination } from '@/components/shop/pagination';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getReviewEligibility, getReviews } from '@/lib/api/reviews';
import { signInUrl } from '@/lib/auth/redirect';
import { ReviewForm } from './review-form';
import { Stars } from './stars';

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

/** The product's rating, how it splits by stars, a page of reviews and the form to add one. */
export async function ProductReviews({ product, page }: { product: ProductDetail; page: number }) {
  const { reviews, total, distribution } = await getReviews(product.slug, page);
  const pages = Math.ceil(total / REVIEW_PAGE_SIZE);
  const href = (target: number) =>
    `/products/${product.slug}${target > 1 ? `?reviews=${target}` : ''}#reviews`;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="grid scroll-mt-24 gap-10 border-t pt-12 lg:grid-cols-[18rem_1fr] lg:gap-16"
    >
      <div className="flex flex-col gap-6">
        <h2 id="reviews-heading" className="text-3xl">
          Reviews
        </h2>
        {product.rating.average !== null && (
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-5xl">{product.rating.average.toFixed(1)}</span>
              <div className="flex flex-col gap-1 text-sm">
                <Stars rating={product.rating.average} />
                <span className="text-muted-foreground">
                  {total} {total === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              {distribution.map((count, index) => (
                <div key={index} className="grid grid-cols-[3rem_1fr_2rem] items-center gap-3">
                  <dt className="text-muted-foreground">{5 - index} star</dt>
                  <dd className="contents">
                    <Progress
                      value={total ? (count / total) * 100 : 0}
                      aria-label={`${count} of ${total} reviews gave ${5 - index} stars`}
                    />
                    <span className="text-right tabular-nums text-muted-foreground">{count}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-10">
        <Suspense fallback={<Skeleton className="h-10 w-64" />}>
          <WriteReview slug={product.slug} />
        </Suspense>

        {reviews.length === 0 ? (
          <Empty className="border px-6 py-12">
            <EmptyDescription>No reviews yet.</EmptyDescription>
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y border-y">
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
        )}

        {pages > 1 && (
          <Pagination page={page} pages={pages} href={href} className="justify-start" />
        )}
      </div>
    </section>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="flex flex-col gap-2 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stars rating={review.rating} className="text-sm" />
        <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
          {dateFormat.format(new Date(review.createdAt))}
        </time>
      </div>
      {review.title && <h3 className="font-sans text-base font-medium">{review.title}</h3>}
      <p className="text-sm leading-7">{review.body}</p>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {review.author}
        <span aria-hidden>·</span>
        <BadgeCheckIcon aria-hidden className="size-3.5" />
        Verified buyer
      </p>
    </li>
  );
}

/** The review form for customers who've received the product, otherwise why not. */
async function WriteReview({ slug }: { slug: string }) {
  const eligibility = await getReviewEligibility(slug);
  if (!eligibility) {
    return (
      <p className="text-sm text-muted-foreground">
        Bought this?{' '}
        <Link
          href={signInUrl(`/products/${slug}#reviews`)}
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>{' '}
        to write a review.
      </p>
    );
  }
  if (eligibility.reason === 'already-reviewed') {
    return <p className="text-sm text-muted-foreground">Thanks for reviewing this.</p>;
  }
  if (eligibility.reason === 'not-purchased') {
    return (
      <p className="text-sm text-muted-foreground">
        You can review this once your order has been delivered.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-sans text-base font-medium">Write a review</h3>
      <ReviewForm slug={slug} />
    </div>
  );
}
