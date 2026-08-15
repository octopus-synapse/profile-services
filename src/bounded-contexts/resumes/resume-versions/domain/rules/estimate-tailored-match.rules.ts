/**
 * Estimate the compatibility after tailoring, from the pre-tailor match
 * breakdown and the keywords the tailoring actually injected (the union
 * of the bullets' `highlights`).
 *
 * Only the keyword signal moves: injected keywords migrate from the
 * `missing` set to the `matched` set and the keyword sub-score is
 * re-derived as coverage; the overall shifts by the keyword signal's
 * effective weight. Semantic/requirements/fit are unchanged — the
 * estimate is conservative and never fabricated: with nothing injected
 * (or no keyword detail available) `after === before`.
 */

import type { TailorMatchEstimate } from '../entities/tailor';
import type { TailorMatchBreakdown } from '../ports/tailor-match.port';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function estimateTailoredMatch(
  breakdown: TailorMatchBreakdown,
  injectedKeywords: readonly string[],
): TailorMatchEstimate {
  const before = clamp(Math.round(breakdown.overallScore), 0, 100);

  const injected = new Set(injectedKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean));
  const missing = breakdown.missing.map((k) => k.toLowerCase());
  const covered = missing.filter((k) => injected.has(k)).length;
  const total = breakdown.matched.length + breakdown.missing.length;

  if (breakdown.keywordScore === null || covered === 0 || total === 0) {
    return { before, after: before, estimated: true };
  }

  const keywordAfter = ((breakdown.matched.length + covered) / total) * 100;
  const lift = breakdown.keywordWeight * (keywordAfter - breakdown.keywordScore);
  const after = clamp(Math.round(before + Math.max(0, lift)), before, 100);

  return { before, after, estimated: true };
}
