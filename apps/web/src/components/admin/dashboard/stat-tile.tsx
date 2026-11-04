import Link from 'next/link';

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
  const className = 'flex h-full flex-col gap-1 rounded-md border p-4';

  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-muted/50`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
