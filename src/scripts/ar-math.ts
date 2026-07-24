/* Pure, framework-free helpers for the /ar scene — kept out of ar.ts (which
   imports three) so they stay unit-testable in plain Node. */

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Overshoots past 1 then settles — the "seating" ease for physical arrivals. */
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Classify a pointer-up as a tap (vs a drag/throw): short travel and quick. */
export const isTap = (movedPx: number, elapsedMs: number, maxPx: number, maxMs: number): boolean =>
  movedPx < maxPx && elapsedMs < maxMs;
