'use client';

import Form from 'next/form';
import { useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

/** A search button that opens a search bar across the top of the page; results open in /shop. */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Search">
          <SearchIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="border-b">
        <SheetTitle className="sr-only">Search the shop</SheetTitle>
        <Form
          action="/shop"
          role="search"
          onSubmit={() => setOpen(false)}
          className="page-container flex items-center gap-3 py-6 pr-14"
        >
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <SearchIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          <Input
            id="header-search"
            name="q"
            type="search"
            placeholder="Search products"
            autoComplete="off"
            required
            maxLength={100}
            className="h-11 border-0 px-0 text-lg shadow-none focus-visible:ring-0"
          />
          <Button type="submit">Search</Button>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
