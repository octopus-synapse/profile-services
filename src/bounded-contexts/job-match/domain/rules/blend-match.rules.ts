import {
  MATCH_WEIGHTS,
  type MatchBreakdown,
  type SubScoreKey,
  type SubScoreResult,
} from '../types';

/**
 * Blends the four sub-scores into the overall Match Score.
 *
 * When a sub-score is `null` (provider declined or AI failure), its
 * slot is dropped from the weighted average and the remaining weights
 * are renormalised so they sum to 1 again. The result stays a proper
 * 0–100 number in every degradation path — callers never see a NaN and
 * never see a score artificially low just because the semantic adapter
 * timed out.
 *
 * Pure function, no side effects.
 */
export function blendMatch(
  subScores: Record<SubScoreKey, SubScoreResult>,
): Pick<MatchBreakdown, 'overallScore' | 'effectiveWeights'> {
  const presentKeys = (Object.keys(MATCH_WEIGHTS) as SubScoreKey[]).filter(
    (k) => subScores[k].score !== null,
  );

  // No usable signal — return 0 rather than NaN. The caller can still
  // surface the per-sub-score state and let the UI render a helpful
  // "AI unavailable" banner.
  if (presentKeys.length === 0) {
    const effective = Object.fromEntries(
      (Object.keys(MATCH_WEIGHTS) as SubScoreKey[]).map((k) => [k, 0]),
    ) as Record<SubScoreKey, number>;
    return { overallScore: 0, effectiveWeights: effective };
  }

  const totalConfiguredWeight = presentKeys.reduce((sum, k) => sum + MATCH_WEIGHTS[k], 0);
  const effectiveWeights = {
    keyword: 0,
    requirements: 0,
    semantic: 0,
    fit: 0,
  } as Record<SubScoreKey, number>;

  let weighted = 0;
  for (const k of presentKeys) {
    const renormalised = MATCH_WEIGHTS[k] / totalConfiguredWeight;
    effectiveWeights[k] = renormalised;
    weighted += (subScores[k].score as number) * renormalised;
  }

  return {
    overallScore: Math.round(Math.max(0, Math.min(100, weighted))),
    effectiveWeights,
  };
}
