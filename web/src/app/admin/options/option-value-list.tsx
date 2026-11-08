'use client';

import type { OptionType } from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { SortableList } from '@/components/admin/sortable-list';
import { Swatch } from '@/components/shop/swatch';
import { deleteOptionValue, reorderOptionValues } from './actions';
import { EditOptionValueDialog } from './option-value-form';

/** An option's values, in the order shoppers see them. */
export function OptionValueList({ optionType }: { optionType: OptionType }) {
  return (
    <SortableList
      items={optionType.values}
      label={(value) => value.label}
      onReorder={(ids) => reorderOptionValues(optionType.id, ids)}
      className="divide-y"
      itemClassName="flex items-center gap-3 py-2 pr-4 pl-2"
    >
      {(value, handle) => (
        <>
          {handle}
          {value.colorHex && <Swatch color={value.colorHex} label={value.label} />}
          <span className="text-sm">{value.label}</span>
          <span className="font-mono text-xs text-muted-foreground">{value.slug}</span>
          <div className="ml-auto flex gap-1">
            <EditOptionValueDialog optionType={optionType} value={value} />
            <ConfirmDeleteDialog
              title={`Delete ${value.label}?`}
              description={`Removes ${value.label} from ${optionType.name}.`}
              action={deleteOptionValue}
              fields={{ typeId: optionType.id, valueId: value.id }}
              label={`Delete ${value.label}`}
            />
          </div>
        </>
      )}
    </SortableList>
  );
}
