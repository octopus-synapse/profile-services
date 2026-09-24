/**
 * Readiness Score — domain types.
 *
 * The Readiness Score answers "how ready is this (master) resume to
 * compete in the market?" WITHOUT a specific job in context — the one
 * job-independent number the Match Score can't provide (Match needs a
 * `(resume, job)` pair).
 *
 * v1 is a deterministic blend of signals the platform already computes,
 * so it costs no extra AI calls:
 *   - quality   — the latest Resume Quality Score (writing + completeness)
 *   - coverage  — breadth of distinct skills/keywords on the resume
 *   - fit       — legacy response slot, disabled and always null
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
 * 1.2.0 — Fit was removed from scoring; Quality and Coverage are the only
 * active factors. */
export const READINESS_RULES_VERSION = '1.2.0';

/**
 * Default factor weights — must sum to 1.0.
 *
 * - quality 68.75% — the dominant "is the CV any good" signal
 * - coverage 31.25% — breadth of demonstrated skills
 * - fit 0% — legacy compatibility slot; intentionally inactive
 */
export const READINESS_WEIGHTS = {
  quality: 0.6875,
  coverage: 0.3125,
  fit: 0,
} as const satisfies Record<ReadinessFactorKey, number>;

/**
 * Distinct-keyword count that maps to a full coverage sub-score. A
 * resume demonstrating this many discrete skills is treated as having
 * saturated the breadth signal.
 */
export const READINESS_COVERAGE_TARGET = 12;
