export const DRAWER_BONUS = 15; // points awarded to drawer per correct guesser

export function calcGuesserPoints(elapsedMs: number, durationMs: number): number {
  return Math.max(10, Math.round(100 * (1 - elapsedMs / durationMs)));
}
