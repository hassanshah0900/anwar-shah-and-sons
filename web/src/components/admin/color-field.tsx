import { Label } from '@/components/ui/label';

type ColorFieldProps = {
  name: string;
  /** Defaults to `name`; set it when several forms share a page. */
  id?: string;
  label: string;
  defaultValue?: string | null;
  error?: string;
};

/** Native colour picker for option swatches; submits a #rrggbb value. */
export function ColorField({ name, id = name, label, defaultValue, error }: ColorFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        name={name}
        type="color"
        defaultValue={defaultValue ?? '#1a1a1a'}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-9 w-16 cursor-pointer rounded-md border border-input bg-transparent p-1"
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
