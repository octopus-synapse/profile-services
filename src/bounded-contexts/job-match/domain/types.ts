/**
 * Shared domain types for the `job-match` bounded context.
 * Free of NestJS + Prisma so the rule and blend layers stay
 * unit-testable with literals.
 */

export type SubScoreKey = 'keyword' | 'requirements' | 'semantic' | 'fit';
// (no external imports — rule layer stays framework- and DB-free)

export interface SubScoreResult {
  /** 0..100; `null` means the provider declined/failed and the caller
   * should reallocate the weight across the remaining sub-scores. */
  readonly score: number | null;
  /** Opaque diagnostic bag the presenter surfaces to the recruiter. */
  readonly detail?: Readonly<Record<string, unknown>>;
}

export interface MatchBreakdown {
  readonly overallScore: number;
  readonly subScores: Readonly<Record<SubScoreKey, SubScoreResult>>;
  /** Snapshot of weights actually used (after reallocation of any
   * null sub-scores). Recruiters see this so they can tell whether the
   * final number is missing a signal. */
  readonly effectiveWeights: Readonly<Record<SubScoreKey, number>>;
  readonly rulesVersion: string;
  readonly computedAt: Date;
}

/** Semver of the Match blend logic. Bumping invalidates cached results
 * (when Redis caching lands in Task #20). */
export const MATCH_RULES_VERSION = '1.2.0';

/**
 * Default top-level weights — must sum to 1.0. The split follows the
 * taxonomy in docs/scoring/README.md:
 *
 * Candidate Match currently uses job-related evidence only. These are the
 * previous keyword/requirements/semantic weights renormalised without Fit.
 * Personality-vector Fit remains outside the overall score until a validated
 * work-preference model replaces it; introversion must not lower Match.
 */
export const MATCH_WEIGHTS = {
  keyword: 0.3125,
  requirements: 0.375,
  semantic: 0.3125,
  fit: 0,
} as const satisfies Record<SubScoreKey, number>;
