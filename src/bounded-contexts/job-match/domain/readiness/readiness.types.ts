/**
 * Readiness Score — domain types.
 *
 * The Readiness Score answers "how ready is this (master) resume to
 * compete in the market?" WITHOUT a specific job in context — the one
 * job-independent number the Match Score can't provide (Match needs a
 * `(resume, job)` pair + a valid fit profile).
 *
 * v1 is a deterministic blend of signals the platform already computes,
 * so it costs no extra AI calls:
 *   - quality   — the latest Resume Quality Score (writing + completeness)
 *   - coverage  — breadth of distinct skills/keywords on the resume
 *   - fit       — fit-questionnaire freshness (does the user have a valid
 *                 behavioural vector, i.e. has matching been unlocked)
 *
 * A market-relative enrichment (coverage measured against the user's
 * target role's in-demand skills) is a deliberate follow-up — see
 * `docs/scoring/SCORES_TODO.md`. Framework- and DB-free so the blend
 * stays unit-testable with literals.
 */

export type ReadinessFactorKey = 'quality' | 'coverage' | 'fit';

export interface ReadinessFactorResult {
  /** 0..100; `null` means the signal is unavailable (e.g. quality not
   * computed yet on a brand-new resume) and its weight is reallocated. */
  readonly score: number | null;
}

export interface ReadinessBreakdown {
  readonly overallScore: number;
  readonly factors: Readonly<Record<ReadinessFactorKey, ReadinessFactorResult>>;
  /** Weights actually used after reallocating any unavailable factor. */
  readonly effectiveWeights: Readonly<Record<ReadinessFactorKey, number>>;
  readonly rulesVersion: string;
  readonly computedAt: Date;
}

/** Semver of the Readiness blend. Bump on any weight/rule change.
 * 1.1.0 — coverage became market-relative (résumé skills vs target-role
 * in-demand skills), falling back to the count-based coverage. */
export const READINESS_RULES_VERSION = '1.1.0';

/**
 * Default factor weights — must sum to 1.0.
 *
 * - quality 55% — the dominant "is the CV any good" signal
 * - coverage 25% — breadth of demonstrated skills
 * - fit 20% — has the user unlocked matching (completed the questionnaire)
 */
export const READINESS_WEIGHTS = {
  quality: 0.55,
  coverage: 0.25,
  fit: 0.2,
} as const satisfies Record<ReadinessFactorKey, number>;

/**
 * Distinct-keyword count that maps to a full coverage sub-score. A
 * resume demonstrating this many discrete skills is treated as having
 * saturated the breadth signal.
 */
export const READINESS_COVERAGE_TARGET = 12;
