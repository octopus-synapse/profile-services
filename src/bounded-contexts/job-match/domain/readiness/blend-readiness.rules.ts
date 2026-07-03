import type { FitStatus } from '../ports/user-fit-state.port';
import {
  READINESS_COVERAGE_TARGET,
  READINESS_WEIGHTS,
  type ReadinessBreakdown,
  type ReadinessFactorKey,
  type ReadinessFactorResult,
} from './readiness.types';

/**
 * Maps distinct-keyword count to a 0..100 coverage sub-score, saturating
 * at `READINESS_COVERAGE_TARGET`. Pure.
 */
export function scoreCoverage(distinctKeywordCount: number): number {
  if (distinctKeywordCount <= 0) return 0;
  const ratio = distinctKeywordCount / READINESS_COVERAGE_TARGET;
  return Math.round(Math.max(0, Math.min(100, ratio * 100)));
}

/**
 * Market-relative coverage: how much of a role's in-demand skill set the
 * résumé demonstrates. `coverage = |resume ∩ role| / |role|`, case-insensitive.
 * Returns `null` when the role skill set is empty (caller falls back to the
 * count-based `scoreCoverage`). Pure.
 */
export function scoreOverlapCoverage(
  resumeSkills: readonly string[],
  roleSkills: readonly string[],
): number | null {
  const role = new Set(roleSkills.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (role.size === 0) return null;
  const resume = new Set(resumeSkills.map((s) => s.trim().toLowerCase()).filter(Boolean));
  let hit = 0;
  for (const s of role) if (resume.has(s)) hit++;
  return Math.round((hit / role.size) * 100);
}

/**
 * Maps fit-questionnaire freshness to a 0..100 sub-score. A valid vector
 * means matching is unlocked (full credit); an expired one is a partial
 * signal (the user did the work once); never-answered is zero. Pure.
 */
export function scoreFitFreshness(status: FitStatus): number {
  switch (status) {
    case 'responded':
      return 100;
    case 'expired':
      return 40;
    case 'never':
      return 0;
  }
}

/**
 * Blends the readiness factors into the overall Readiness Score.
 *
 * Mirrors `blendMatch`: any `null` factor is dropped and the remaining
 * weights renormalise to sum to 1, so a brand-new resume with no Quality
 * Score yet still yields a proper 0..100 from coverage + fit alone.
 * Pure, no side effects.
 */
export function blendReadiness(
  factors: Record<ReadinessFactorKey, ReadinessFactorResult>,
): Pick<ReadinessBreakdown, 'overallScore' | 'effectiveWeights'> {
  const keys = Object.keys(READINESS_WEIGHTS) as ReadinessFactorKey[];
  const presentKeys = keys.filter((k) => factors[k].score !== null);

  const zeroWeights = Object.fromEntries(keys.map((k) => [k, 0])) as Record<
    ReadinessFactorKey,
    number
  >;

  if (presentKeys.length === 0) {
    return { overallScore: 0, effectiveWeights: zeroWeights };
  }

  const totalConfiguredWeight = presentKeys.reduce((sum, k) => sum + READINESS_WEIGHTS[k], 0);
  const effectiveWeights = { ...zeroWeights };

  let weighted = 0;
  for (const k of presentKeys) {
    const renormalised = READINESS_WEIGHTS[k] / totalConfiguredWeight;
    effectiveWeights[k] = renormalised;
    weighted += (factors[k].score as number) * renormalised;
  }

  return { overallScore: Math.round(Math.max(0, Math.min(100, weighted))), effectiveWeights };
}
