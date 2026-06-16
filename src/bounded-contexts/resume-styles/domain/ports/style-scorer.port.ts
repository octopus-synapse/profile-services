/**
 * Style Scorer Port — abstraction for computing a ResumeStyle's
 * ATS-safety Style Score (0-100) from its design config.
 *
 * The real implementation (data-driven, catalog-backed) lives in the
 * resume-styles/ infrastructure layer. No cross-bounded-context coupling.
 */

import type { StyleScoreInput, StyleScoreResult } from '../types';

export abstract class StyleScorerPort {
  /** Compute the overall score, per-bucket breakdown and the actionable
   * issues for every failed criterion. Async because the rubric criteria
   * are loaded from the tunable catalog. */
  abstract score(input: StyleScoreInput): Promise<StyleScoreResult>;
}
