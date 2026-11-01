import { getApiHealth } from '@/lib/api/health';

const dotColor = {
  up: 'bg-success',
  degraded: 'bg-muted-foreground',
  down: 'bg-destructive',
} as const;

/** Server component showing live API health. Uncached: render it inside <Suspense>. */
export async function ApiStatus() {
  const result = await getApiHealth();

  if (!result.reachable) {
    return <StatusLine state="down" label="API unreachable" detail={result.reason} />;
  }

  const { health } = result;
  const failing = Object.entries(health.checks)
    .filter(([, check]) => check.status === 'down')
    .map(([name]) => name);

  return health.status === 'ok' ? (
    <StatusLine state="up" label="API operational" />
  ) : (
    <StatusLine state="degraded" label="API degraded" detail={`Down: ${failing.join(', ')}`} />
  );
}

export function ApiStatusSkeleton() {
  return <p className="text-sm text-muted-foreground">Checking API status…</p>;
}

function StatusLine({
  state,
  label,
  detail,
}: {
  state: keyof typeof dotColor;
  label: string;
  detail?: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-foreground">
      <span aria-hidden className={`size-2 rounded-full ${dotColor[state]}`} />
      <span className="font-medium">{label}</span>
      {detail && <span className="text-muted-foreground">({detail})</span>}
    </p>
  );
}
