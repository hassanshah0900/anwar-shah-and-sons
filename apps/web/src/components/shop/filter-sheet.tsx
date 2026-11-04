'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

/** The filters in a side sheet on small screens. Closes once a filter is chosen. */
export function FilterSheet({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontalIcon />
          Filters{count > 0 && ` (${count})`}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full max-w-xs overflow-y-auto"
        // Radix would focus the first input (the price box), opening the phone keyboard.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        {/* Links and the price form navigate; close the sheet when either is used. */}
        <div
          className="px-4 pb-8"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setOpen(false);
          }}
          onSubmit={() => setOpen(false)}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
