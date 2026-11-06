import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormFieldProps = React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  error?: string;
};

/** A labelled input whose error is announced to screen readers. */
export function FormField({ name, label, error, id = name, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
