/**
 * Pure Style Score computation.
 *
 * Given a normalized style input and the active scoring criteria (loaded
 * from the data-driven catalog), award each passing criterion's weight to
 * its bucket and emit an actionable issue for each failing one. Same input
 * → same output, so it's trivial to unit-test against the seeded styles.
 */

import type {
  StyleIssue,
  StyleScoreInput,
  StyleScoreResult,
  StyleScoringCriterionDef,
} from '../../types';
import { EVALUATORS, STYLE_ISSUE_CODE } from './criteria-evaluators';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function scoreStyle(
  input: StyleScoreInput,
  criteria: readonly StyleScoringCriterionDef[],
): StyleScoreResult {
  const buckets: Record<string, number> = {};
  const issues: StyleIssue[] = [];
  let total = 0;

  for (const criterion of criteria) {
    const evaluator = EVALUATORS[criterion.key];
    // Unknown key in the catalog (e.g. a future criterion not yet shipped
    // in code): skip it rather than crash, so the rubric degrades safely.
    if (!evaluator) continue;

    const outcome = evaluator(input, criterion.params);
    buckets[criterion.bucket] ??= 0;
    if (outcome.pass) {
      total += criterion.weight;
      buckets[criterion.bucket] += criterion.weight;
    } else {
      issues.push({
        code: STYLE_ISSUE_CODE[criterion.key] ?? criterion.key,
        severity: criterion.severity,
        bucket: criterion.bucket,
        ...(outcome.messageArgs ? { messageArgs: outcome.messageArgs } : {}),
      });
    }
  }

  return {
    overall: Math.round(clamp(total, 0, 100)),
    breakdown: buckets,
    issues,
  };
}
