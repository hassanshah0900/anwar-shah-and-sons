import Image from 'next/image';
import Link from 'next/link';
import { Stars } from '@/components/reviews/stars';
import { Card } from '@/components/ui/card';
import { getReviewHighlights } from '@/lib/api/reviews';

const COUNT = 3;

/** Recent well-rated reviews, each linking to its product; nothing when there are none. */
export async function ReviewHighlights() {
  const { reviews } = await getReviewHighlights(COUNT);
  if (reviews.length === 0) return null;

  return (
    <section
      aria-labelledby="highlights-heading"
      className="page-container flex flex-col gap-8 pb-16"
    >
      <h2 id="highlights-heading" className="text-3xl sm:text-4xl">
        What customers say
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {reviews.map((review) => (
          <li key={review.id}>
            <Card className="h-full justify-between gap-6 p-6 text-base">
              <blockquote className="flex flex-col gap-3">
                <Stars rating={review.rating} className="text-sm" />
                {review.title && <p className="font-medium">{review.title}</p>}
                <p className="text-sm leading-7 text-muted-foreground">“{review.body}”</p>
                <footer className="text-sm">{review.author}</footer>
              </blockquote>
              <Link
                href={`/products/${review.product.slug}#reviews`}
                className="flex items-center gap-3 border-t pt-4 text-sm hover:underline"
              >
                <span className="relative aspect-3/4 w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
                  {review.product.image && (
                    <Image
                      src={`/media/${review.product.image.key}`}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  )}
                </span>
                {review.product.name}
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
