import Link from 'next/link';
import { Card } from '@/components/ui/card';

/** One headline number. With `href`, the whole tile links to the matching list. */
export function StatTile({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-medium tracking-tight tabular-nums">{value}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </>
  );
  const className = 'h-full gap-1 p-4 text-base';

  return href ? (
    <Link href={href} className="block h-full rounded-md">
      <Card className={`${className} transition-colors hover:bg-muted/50`}>{body}</Card>
    </Link>
  ) : (
    <Card className={className}>{body}</Card>
  );
}
