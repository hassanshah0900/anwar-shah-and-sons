import { cn } from '@/lib/utils';

/** A round colour sample for a colour option value. */
export function Swatch({
  color,
  label,
  className,
}: {
  color: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${label} swatch`}
      className={cn('inline-block size-5 shrink-0 rounded-full border', className)}
      // Product colours are data, not design tokens.
      style={{ backgroundColor: color }}
    />
  );
}
