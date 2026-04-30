/**
 * Shared domain types for the `fit-profile` bounded context.
 *
 * Kept framework-free so the rule layer (vectoriser, sampler, similarity
 * math) stays pure and trivially unit-testable with literals — and so the
 * same shapes can travel to the UI via DTOs without pulling Prisma types
 * across the layer boundary.
 */

/** Concatenated psychometric dimension space. Keep the ordering stable —
 * `concatVector` below relies on it and so does the remap-history JSON
 * shape persisted in `FitRemapHistory.vectorJson`. Add new dimensions at
 * the end; never rename an existing one. */
export const FIT_DIMENSIONS = [
  // Big Five (OCEAN)
  'BIG_FIVE_OPENNESS',
  'BIG_FIVE_CONSCIENTIOUSNESS',
  'BIG_FIVE_EXTRAVERSION',
  'BIG_FIVE_AGREEABLENESS',
  'BIG_FIVE_NEUROTICISM',
  // Schwartz basic values
  'SCHWARTZ_SELF_DIRECTION',
  'SCHWARTZ_STIMULATION',
  'SCHWARTZ_HEDONISM',
  'SCHWARTZ_ACHIEVEMENT',
  'SCHWARTZ_POWER',
  'SCHWARTZ_SECURITY',
  'SCHWARTZ_CONFORMITY',
  'SCHWARTZ_TRADITION',
  'SCHWARTZ_BENEVOLENCE',
  'SCHWARTZ_UNIVERSALISM',
  // Self-Determination Theory (SDT) basic psychological needs
  'SDT_AUTONOMY',
  'SDT_COMPETENCE',
  'SDT_RELATEDNESS',
] as const;

export type FitDimension = (typeof FIT_DIMENSIONS)[number];

/** Big Five dimensions (5). */
export const BIG_FIVE_DIMENSIONS = FIT_DIMENSIONS.slice(0, 5) as readonly FitDimension[];
/** Schwartz basic values (10). */
export const SCHWARTZ_DIMENSIONS = FIT_DIMENSIONS.slice(5, 15) as readonly FitDimension[];
/** SDT basic needs (3). */
export const SDT_DIMENSIONS = FIT_DIMENSIONS.slice(15, 18) as readonly FitDimension[];

/** Vector shape persisted in `UserFitProfile.vectorJson` and
 * `JobFitProfile.vectorJson`. Each per-dimension value is normalised to
 * the inclusive range [0,1] so similarity math is scale-invariant. */
export interface FitVector {
  readonly bigFive: { readonly [K in FitDimension]?: number };
  readonly schwartz: { readonly [K in FitDimension]?: number };
  readonly sdt: { readonly [K in FitDimension]?: number };
}

/** How many of the 25 sampled questions each "block" contributes. The
 * ratios are intentionally proportional to the number of dimensions in
 * each block (5/10/3) with a +1 nudge on Schwartz to fill to 25. */
export const QUESTION_SET_SIZE = 25;
export const BLOCK_SAMPLE_COUNTS = { bigFive: 7, schwartz: 13, sdt: 5 } as const;

/** Weights used when blending the three blocks into the concatenated
 * similarity vector. They are intentionally equal across sub-blocks
 * (mean-pooled per block, then 1/3 each) so early tweaks do not bias
 * toward any single framework. Mahalanobis + ML-learned weights are
 * tracked as TODOs in `docs/scoring/SCORES_TODO.md`. */
export const SIMILARITY_BLOCK_WEIGHTS = { bigFive: 1 / 3, schwartz: 1 / 3, sdt: 1 / 3 } as const;

/** Semver of the deterministic fit-profile rule set (sampler +
 * vectoriser + similarity math). Bump MAJOR when the vector shape
 * changes; MINOR when weights shift; PATCH for bug fixes. */
export const FIT_RULES_VERSION = '1.0.0';

/** Expiry window for a cached user vector — matches the 90-day remap
 * cycle documented in `docs/scoring/README.md`. */
export const FIT_VECTOR_TTL_DAYS = 90;

/** Scale type for a FitQuestion. Mirrors the string stored on
 * `FitQuestion.scaleType`; enumerated here so the vectoriser can branch
 * without stringly-typed comparisons all over the codebase. */
export type FitScaleType = 'likert5' | 'binary';

/** Status of a user's fit-profile lifecycle — drives the client-side
 * call-to-action and the backend lockout gate in `job-match/`. */
export type FitProfileStatus = 'never' | 'responded' | 'expired';
