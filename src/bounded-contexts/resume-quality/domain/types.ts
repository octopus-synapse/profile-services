/**
 * Shared domain types for the `resume-quality` bounded context.
 * Kept free of NestJS + Prisma so the rule layer stays testable in
 * isolation and the same shapes can travel to the UI via DTOs.
 */

/** Stable machine-readable codes for issues surfaced to the user.
 *
 * Codes that start with `CODE_` are emitted by deterministic rules; codes
 * that start with `AI_` are emitted by the Content Quality analyzer. Keep
 * this list stable — changing a code breaks i18n lookups and historical
 * snapshots. Add new values; never rename. */
export type IssueCode =
  // Completeness (deterministic)
  | 'CODE_MISSING_FULL_NAME'
  | 'CODE_MISSING_EMAIL'
  | 'CODE_MISSING_PHONE'
  | 'CODE_MISSING_SUMMARY'
  | 'CODE_MISSING_JOB_TITLE'
  | 'CODE_MISSING_EXPERIENCE'
  | 'CODE_MISSING_EDUCATION'
  | 'CODE_MISSING_SKILLS'
  | 'CODE_MISSING_DATES'
  | 'CODE_SUMMARY_TOO_SHORT'
  | 'CODE_DUPLICATE_SKILL'
  | 'CODE_TEMPORAL_OVERLAP'
  // Structural ATS checks ported from the retired ATS score. Advisory:
  // they surface issues but do not change the completeness number.
  | 'CODE_MISSING_MANDATORY_SECTION'
  | 'CODE_MISSING_WEIGHTED_FIELDS'
  // Content quality (AI)
  | 'AI_VAGUE_BULLET'
  | 'AI_NO_METRIC'
  | 'AI_WEAK_VERB'
  | 'AI_OTHER';

/** Every `IssueCode` as a runtime array — the single source of truth the
 * i18n parity spec walks to assert each code has a dictionary entry. Keep
 * in sync with the union above. */
export const ALL_ISSUE_CODES = [
  'CODE_MISSING_FULL_NAME',
  'CODE_MISSING_EMAIL',
  'CODE_MISSING_PHONE',
  'CODE_MISSING_SUMMARY',
  'CODE_MISSING_JOB_TITLE',
  'CODE_MISSING_EXPERIENCE',
  'CODE_MISSING_EDUCATION',
  'CODE_MISSING_SKILLS',
  'CODE_MISSING_DATES',
  'CODE_SUMMARY_TOO_SHORT',
  'CODE_DUPLICATE_SKILL',
  'CODE_TEMPORAL_OVERLAP',
  'CODE_MISSING_MANDATORY_SECTION',
  'CODE_MISSING_WEIGHTED_FIELDS',
  'AI_VAGUE_BULLET',
  'AI_NO_METRIC',
  'AI_WEAK_VERB',
  'AI_OTHER',
] as const satisfies readonly IssueCode[];

export type IssueSeverity = 'low' | 'medium' | 'high';

export interface QualityIssue {
  readonly code: IssueCode;
  readonly severity: IssueSeverity;
  /** Bag of arguments to be interpolated into the i18n template. */
  readonly messageArgs?: Readonly<Record<string, unknown>>;
  /** Fallback text when the caller has no template for `code`. */
  readonly freeformMessage?: string;
  readonly context?: {
    readonly sectionKey?: string;
    readonly itemIndex?: number;
    readonly excerpt?: string;
  };
}

export interface QualityBreakdown {
  readonly overallScore: number;
  readonly completenessScore: number;
  /** `null` when the AI port is disabled or failed — the caller must
   * degrade gracefully rather than blocking on content quality. */
  readonly contentQualityScore: number | null;
  readonly issues: readonly QualityIssue[];
  readonly scoringRulesVersion: string;
  readonly aiPromptVersion: string | null;
  readonly aiCallsCount: number;
  readonly costUsdMicros: bigint;
}

/** Semver of the deterministic rule set. Bump MAJOR when issue codes
 * are removed; MINOR when weights shift; PATCH for bug fixes.
 * 1.1.0 — `phone` now scores (was advisory) and a new `dates` rule
 * (start dates on experience/education) was added; `experience` and
 * `education` were trimmed to carve room while keeping the sum at 100. */
export const COMPLETENESS_RULES_VERSION = '1.1.0';

/** Weight each completeness rule contributes to the completeness score.
 * The values intentionally sum to 100 so the score stays in the 0–100
 * range without extra normalisation. */
export const COMPLETENESS_WEIGHTS = {
  fullName: 8,
  email: 6,
  phone: 4,
  summary: 14,
  jobTitle: 6,
  experience: 25,
  education: 11,
  dates: 4,
  skills: 12,
  temporalConsistency: 6,
  uniqueSkills: 4,
} as const;
