/** How close a bag is to free delivery, or null when the store has no such offer. */
export function freeDeliveryProgress(
  subtotal: number,
  freeOver: number | null,
): { remaining: number; percent: number } | null {
  if (freeOver === null || freeOver <= 0) return null;
  const remaining = Math.max(0, freeOver - subtotal);
  return { remaining, percent: Math.min(100, Math.round((subtotal / freeOver) * 100)) };
}
