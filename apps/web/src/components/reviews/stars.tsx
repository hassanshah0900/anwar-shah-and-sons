import { StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Five stars with `rating` of them filled (rounded to the nearest whole star). */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating);

  return (
    <span
      role="img"
      aria-label={`Rated ${rating} out of 5`}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          aria-hidden
          className={cn(
            'size-[1em] shrink-0',
            index < filled ? 'fill-foreground text-foreground' : 'text-muted-foreground/50',
          )}
        />
      ))}
    </span>
  );
}

/** "★★★★☆ 4.3 (12)", or nothing when the product has no reviews yet. */
export function RatingSummary({
  rating,
  className,
}: {
  rating: { average: number | null; count: number };
  className?: string;
}) {
  if (rating.average === null) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 tabular-nums', className)}>
      <Stars rating={rating.average} />
      <span>{rating.average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({rating.count}
        <span className="sr-only"> {rating.count === 1 ? 'review' : 'reviews'}</span>)
      </span>
    </span>
  );
}
