'use client';

import Link from 'next/link';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SortChoice = { label: string; href: string; active: boolean };

/** Sort order as a menu of links, so each order keeps its own URL. */
export function SortMenu({ choices }: { choices: SortChoice[] }) {
  const current = choices.find((choice) => choice.active) ?? choices[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <span className="text-muted-foreground">Sort:</span> {current?.label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {choices.map((choice) => (
          <DropdownMenuItem key={choice.href} asChild>
            <Link href={choice.href} scroll={false} aria-current={choice.active || undefined}>
              {choice.label}
              {choice.active && <CheckIcon className="ml-auto" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
