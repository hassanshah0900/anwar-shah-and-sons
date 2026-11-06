'use client';

import { useId, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_PAGE_SIZE } from '@repo/shared';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Rows per page, kept in the URL as `pageSize` so the view can be shared.
 * Changing it goes back to the first page, since the old page number may no longer exist.
 */
export function PageSizeSelect({
  pageSize,
  sizes,
}: {
  pageSize: number;
  sizes: readonly number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const id = useId();
  // A size typed into the URL still shows as the current choice.
  const choices = [...new Set([...sizes, pageSize])].sort((a, b) => a - b);

  function change(value: string) {
    const params = new URLSearchParams(searchParams);
    if (Number(value) === DEFAULT_PAGE_SIZE) params.delete('pageSize');
    else params.set('pageSize', value);
    params.delete('page');
    startTransition(() =>
      router.push(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false }),
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="font-normal whitespace-nowrap text-muted-foreground">
        Rows per page
      </Label>
      <Select value={String(pageSize)} onValueChange={change} disabled={pending}>
        <SelectTrigger id={id} size="sm" className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choices.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
