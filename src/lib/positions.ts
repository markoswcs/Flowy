/**
 * Returns a stable numeric position for an item inserted between neighbours.
 * Positions are intentionally sparse so most drag operations require one write.
 */
export function positionBetween(
  before: number | null | undefined,
  after: number | null | undefined,
): number {
  if (before == null && after == null) return 1_000;
  if (before == null) return Math.max(1, (after ?? 1_000) / 2);
  if (after == null) return before + 1_000;
  return before + (after - before) / 2;
}

export function hasUnsafePositionGap(before: number, after: number): boolean {
  return (
    !Number.isFinite(before) ||
    !Number.isFinite(after) ||
    after - before < 0.000_001
  );
}

export function normalizedPositions(length: number): number[] {
  return Array.from({ length }, (_, index) => (index + 1) * 1_000);
}
