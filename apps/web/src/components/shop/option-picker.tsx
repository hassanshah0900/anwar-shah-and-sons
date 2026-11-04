'use client';

import type { ProductDetail } from '@repo/shared';
import type { ValueState } from '@/lib/catalog/variant-selection';
import { cn } from '@/lib/utils';

type Option = ProductDetail['options'][number];

/**
 * One option as a group of radio buttons: swatches for colours, labelled boxes
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
      <div className="flex flex-wrap gap-2">
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
            <label
              key={value.id}
              title={value.label}
              className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-sm border text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                isColor ? 'size-10 p-1' : 'h-10 min-w-12 px-3',
                checked ? 'border-foreground' : 'hover:border-foreground',
                checked && !isColor && 'bg-primary text-primary-foreground',
                state !== 'available' && !checked && 'text-muted-foreground',
              )}
            >
              <input
                type="radio"
                name={option.slug}
                value={value.id}
                checked={checked}
                onChange={() => onChoose(value.id)}
                className="sr-only"
                aria-label={`${value.label}${note}`}
              />
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
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
