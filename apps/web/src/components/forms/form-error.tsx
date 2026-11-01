/** A form-level error, announced as soon as it appears. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p role="alert" className="border border-destructive/40 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
