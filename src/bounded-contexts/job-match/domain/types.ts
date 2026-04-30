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
export const MATCH_RULES_VERSION = '1.0.0';

/**
 * Default top-level weights — must sum to 1.0. The split follows the
 * taxonomy in docs/scoring/README.md:
 *
 * - Keyword 25% — cheap code signal, catches stack alignment
 * - Requirements 30% — dominant because "does the candidate meet the
 *   hard gate" (years, languages, certifications) is the single highest
 *   predictor of ATS pass-through
 * - Semantic 25% — embedding similarity of CV body vs JD body; high
 *   signal but noisy
 * - Fit 20% — behavioural vector match (delegated to fit-profile/);
 *   kept lighter because personality is a long-tail factor not a gate
 */
export const MATCH_WEIGHTS = {
  keyword: 0.25,
  requirements: 0.3,
  semantic: 0.25,
  fit: 0.2,
} as const satisfies Record<SubScoreKey, number>;
