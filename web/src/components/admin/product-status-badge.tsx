import type { ProductStatus } from '@repo/shared';
import { Badge } from '@/components/ui/badge';

const variants = { active: 'default', draft: 'outline', archived: 'secondary' } as const;
const labels = { active: 'Active', draft: 'Draft', archived: 'Archived' } satisfies Record<
  ProductStatus,
  string
>;

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
