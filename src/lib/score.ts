/**
 * Pure function for calculating ranking score
 * Mirrors the backend formula in supabase/functions/rank/index.ts
 */

export interface ScoreParams {
  protein: number;
  calories: number;
  price: number;
  targetProtein?: number | null;
  targetCalories?: number | null;
  wP: number;
  wC: number;
  wR: number;
  mode: 'bulking' | 'cutting';
}

export function calculateScore({
  protein,
  calories,
  price,
  targetProtein,
  targetCalories,
  wP,
  wC,
  wR,
  mode,
}: ScoreParams): number {
  // Calculate protein difference
  const proteinDiff = targetProtein !== null && targetProtein !== undefined
    ? Math.abs(protein - targetProtein) / Math.max(1, targetProtein)
    : 0;

  // Calculate calorie difference
  const calorieDiff = targetCalories !== null && targetCalories !== undefined
    ? Math.abs(calories - targetCalories) / Math.max(1, targetCalories)
    : 0;

  // Cutting penalty
  const cuttingPenalty = mode === 'cutting' ? 0.15 * (calories / 1000.0) : 0;

  // Final score (lower is better)
  const score = wP * proteinDiff + wC * calorieDiff + wR * price + cuttingPenalty;

  return Number(score.toFixed(4));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
