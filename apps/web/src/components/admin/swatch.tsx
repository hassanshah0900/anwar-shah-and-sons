/** A round colour sample for a colour option value. */
export function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={`${label} swatch`}
      className="inline-block size-5 shrink-0 rounded-full border"
      // Product colours are data, not design tokens.
      style={{ backgroundColor: color }}
    />
  );
}
