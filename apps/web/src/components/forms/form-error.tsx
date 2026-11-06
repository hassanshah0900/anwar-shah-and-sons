import { Alert, AlertDescription } from '@/components/ui/alert';

/** A form-level error, announced as soon as it appears. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Alert variant="destructive" className="px-3">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
