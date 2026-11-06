'use client';

import type { ProductDetail } from '@repo/shared';
import type { ValueState } from '@/lib/catalog/variant-selection';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

type Option = ProductDetail['options'][number];

/**
 * One option as a single-choice toggle group: swatches for colours, labelled boxes
 * otherwise. Sold-out and unavailable values stay choosable (picking one clears
 * choices it can't combine with) but are crossed out.
 */
export function OptionPicker({
  option,
  selectedId,
  stateOf,
  onChoose,
}: {
  option: Option;
  selectedId: string | undefined;
  stateOf: (valueId: string) => ValueState;
  onChoose: (valueId: string) => void;
}) {
  const selected = option.values.find((value) => value.id === selectedId);
  const isColor = option.kind === 'color';

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm">
        <span className="text-muted-foreground">{option.name}:</span>{' '}
        {selected?.label ?? <span className="text-muted-foreground">Select</span>}
      </legend>
      <ToggleGroup
        type="single"
        value={selectedId ?? ''}
        // Clicking the chosen value again would clear it; keep the choice instead.
        onValueChange={(valueId) => valueId && onChoose(valueId)}
        spacing={2}
        className="flex-wrap"
      >
        {option.values.map((value) => {
          const state = stateOf(value.id);
          const checked = value.id === selectedId;
          const note =
            state === 'sold_out'
              ? ' (sold out)'
              : state === 'unavailable'
                ? ' (not available with your selection)'
                : '';

          return (
            <ToggleGroupItem
              key={value.id}
              value={value.id}
              title={value.label}
              aria-label={`${value.label}${note}`}
              className={cn(
                'relative rounded-sm border font-normal hover:bg-transparent data-[state=on]:bg-transparent',
                isColor ? 'size-10 p-1' : 'h-10 min-w-12 px-3',
                checked ? 'border-foreground' : 'hover:border-foreground',
                checked &&
                  !isColor &&
                  'bg-primary text-primary-foreground hover:bg-primary data-[state=on]:bg-primary',
                state !== 'available' && !checked && 'text-muted-foreground',
              )}
            >
              {isColor ? (
                <span
                  aria-hidden
                  className="size-full rounded-xs border"
                  // Product colours are data, not design tokens.
                  style={{ backgroundColor: value.colorHex ?? undefined }}
                />
              ) : (
                <span aria-hidden>{value.label}</span>
              )}
              {state !== 'available' && (
                // A diagonal strike, drawn with a rotated hairline.
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm"
                >
                  <span className="absolute top-1/2 left-1/2 h-px w-[141%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-muted-foreground" />
                </span>
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </fieldset>
  );
}
