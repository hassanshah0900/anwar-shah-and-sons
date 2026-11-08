'use client';

import type { Product } from '@repo/shared';
import { SortableList } from '@/components/admin/sortable-list';
import { reorderProductOptions } from './actions';

/** The order a product's options are shown in, e.g. Colour before Size. Saved on drop. */
export function OptionOrder({ product }: { product: Product }) {
  const options = product.options.map((option) => ({ ...option, id: option.optionTypeId }));

  return (
    <div className="grid gap-2">
      <p className="mt-2 text-sm font-medium">Order shown to shoppers</p>
      <SortableList
        items={options}
        label={(option) => option.name}
        onReorder={(ids) => reorderProductOptions(product.id, ids)}
        className="max-w-sm divide-y border"
        itemClassName="flex items-center gap-2 py-1 pr-3 pl-1 text-sm"
      >
        {(option, handle) => (
          <>
            {handle}
            {option.name}
          </>
        )}
      </SortableList>
    </div>
  );
}
