/**
 * Style Scoring Catalog Port — loads the tunable rubric criteria
 * (weights / thresholds / allowlists) the Style Scorer evaluates.
 *
 * Mirrors `AtsScoreCatalogPort` in analytics: the data lives in a DB
 * table so admins can tune the rubric without a deploy; the evaluator
 * functions stay in code, keyed by `criterion.key`.
 */

import type { StyleScoringCriterionDef } from '../types';

export abstract class StyleScoringCatalogPort {
  /** Active criteria only, ready to feed `scoreStyle`. */
  abstract loadCriteria(): Promise<StyleScoringCriterionDef[]>;
}
