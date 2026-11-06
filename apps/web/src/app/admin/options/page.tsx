import type { Metadata } from 'next';
import { Suspense } from 'react';
import { optionTypeListSchema, type OptionType } from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { Swatch } from '@/components/shop/swatch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/server';
import { deleteOptionType, deleteOptionValue } from './actions';
import { OptionTypeDialog } from './option-type-dialog';
import { AddOptionValueForm, EditOptionValueDialog } from './option-value-form';
import { Empty, EmptyDescription } from '@/components/ui/empty';

export const metadata: Metadata = { title: 'Options' };

export default function OptionsPage() {
  return (
    <main className="page-container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Options</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The ways products vary, such as Size or Colour. Each combination becomes a variant.
          </p>
        </div>
        <OptionTypeDialog />
      </div>
      <Suspense fallback={<Skeleton className="mt-8 h-64 w-full" />}>
        <OptionTypes />
      </Suspense>
    </main>
  );
}

async function OptionTypes() {
  const { optionTypes } = await apiRequest('/api/v1/admin/option-types', optionTypeListSchema);

  if (optionTypes.length === 0) {
    return (
      <Empty className="mt-10 border p-10">
        <EmptyDescription>No options yet. Start with Size and Colour.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="mt-8 grid gap-6">
      {optionTypes.map((optionType) => (
        <OptionTypeSection key={optionType.id} optionType={optionType} />
      ))}
    </div>
  );
}

function OptionTypeSection({ optionType }: { optionType: OptionType }) {
  return (
    <section aria-labelledby={`option-${optionType.id}`} className="border">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <h2 id={`option-${optionType.id}`} className="font-sans text-lg font-medium">
          {optionType.name}
        </h2>
        <Badge variant="outline">{optionType.kind === 'color' ? 'Colour' : 'Text'}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{optionType.slug}</span>
        <div className="ml-auto flex gap-1">
          <OptionTypeDialog optionType={optionType} />
          <ConfirmDeleteDialog
            title={`Delete ${optionType.name}?`}
            description="Its values are deleted too. This can't be undone."
            action={deleteOptionType}
            fields={{ id: optionType.id }}
            label={`Delete ${optionType.name}`}
          />
        </div>
      </header>

      {optionType.values.length > 0 && (
        <ul className="divide-y">
          {optionType.values.map((value) => (
            <li key={value.id} className="flex items-center gap-3 px-4 py-2">
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
            </li>
          ))}
        </ul>
      )}

      <div className="border-t bg-muted/40 px-4 py-4">
        <AddOptionValueForm optionType={optionType} />
      </div>
    </section>
  );
}
