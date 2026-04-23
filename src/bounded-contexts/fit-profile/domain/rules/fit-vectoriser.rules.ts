import {
  BIG_FIVE_DIMENSIONS,
  FIT_DIMENSIONS,
  type FitDimension,
  type FitScaleType,
  type FitVector,
  SCHWARTZ_DIMENSIONS,
  SDT_DIMENSIONS,
} from '../types';

/** Raw answer fed to the vectoriser. Each answer carries its dimension +
 * the item weight so the rule layer stays decoupled from persistence:
 * the use-case joins `FitAnswer` ↔ `FitQuestion` and hands the result
 * here as pure data. */
export interface ScoredAnswer {
  readonly dimension: FitDimension;
  readonly scaleType: FitScaleType;
  readonly weight: number;
  /** The Likert/binary raw as stored on `FitAnswer.rawValue`.
   *  - likert5  → 1..5
   *  - binary   → 0 or 1 */
  readonly rawValue: number;
  /** When true, a high raw response contributes negatively to the
   * dimension — classic reverse-scored personality item. */
  readonly reverse?: boolean;
}

/** Normalise a single raw answer to the inclusive range [0,1]. Out-of-
 * range values are clamped rather than rejected so a malformed input
 * degrades gracefully into a neutral contribution (0 after reversing a
 * clamped neutral stays neutral too). */
export function normalizeRaw(raw: number, scaleType: FitScaleType): number {
  if (scaleType === 'binary') {
    return raw >= 1 ? 1 : 0;
  }
  // likert5: map 1..5 → 0..1, clamping out-of-range.
  const clamped = Math.max(1, Math.min(5, raw));
  return (clamped - 1) / 4;
}

/** Apply reverse-scoring when configured — a reverse-scored item asks
 * the trait inverted, so a low raw actually signals a high trait. */
export function applyReverse(normalized: number, reverse: boolean): number {
  return reverse ? 1 - normalized : normalized;
}

/**
 * Pure vectoriser. Groups answers by dimension, weighted-averages them
 * to a [0,1] score per dimension, then packages the result into the
 * three-block `FitVector` shape persisted on `UserFitProfile.vectorJson`.
 *
 * Dimensions with no answers are omitted — the reader (similarity) must
 * treat a missing dimension as "no signal" and fall back to the other
 * side's score (or the block mean) rather than blowing up.
 */
export function vectoriseAnswers(answers: readonly ScoredAnswer[]): FitVector {
  const sums = new Map<FitDimension, { weighted: number; weight: number }>();

  for (const answer of answers) {
    const normalized = normalizeRaw(answer.rawValue, answer.scaleType);
    const reversed = applyReverse(normalized, answer.reverse ?? false);
    const weight = Number.isFinite(answer.weight) && answer.weight > 0 ? answer.weight : 1;

    const existing = sums.get(answer.dimension) ?? { weighted: 0, weight: 0 };
    existing.weighted += reversed * weight;
    existing.weight += weight;
    sums.set(answer.dimension, existing);
  }

  const bigFive: Partial<Record<FitDimension, number>> = {};
  const schwartz: Partial<Record<FitDimension, number>> = {};
  const sdt: Partial<Record<FitDimension, number>> = {};

  for (const dimension of FIT_DIMENSIONS) {
    const agg = sums.get(dimension);
    if (!agg || agg.weight === 0) continue;
    const score = round3(agg.weighted / agg.weight);

    if (BIG_FIVE_DIMENSIONS.includes(dimension)) bigFive[dimension] = score;
    else if (SCHWARTZ_DIMENSIONS.includes(dimension)) schwartz[dimension] = score;
    else if (SDT_DIMENSIONS.includes(dimension)) sdt[dimension] = score;
  }

  return { bigFive, schwartz, sdt };
}

/** Project a `FitVector` into a flat numeric array aligned to
 * `FIT_DIMENSIONS`. Missing dimensions become `null` so the similarity
 * layer can decide how to handle them (treat as neutral 0.5, drop,
 * etc.) instead of the vectoriser silently inventing numbers. */
export function concatVector(vector: FitVector): ReadonlyArray<number | null> {
  return FIT_DIMENSIONS.map((dimension) => {
    if (BIG_FIVE_DIMENSIONS.includes(dimension)) return vector.bigFive[dimension] ?? null;
    if (SCHWARTZ_DIMENSIONS.includes(dimension)) return vector.schwartz[dimension] ?? null;
    return vector.sdt[dimension] ?? null;
  });
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
