/**
 * Clean Architecture Rule Runner
 *
 * Each rule returns an array of violations.
 * The orchestrator runs all rules and aggregates violations.
 */

export interface RuleResult {
  rule: string;
  category: string;
  violations: string[];
}

export type Rule = () => RuleResult;

export function runRule(
  ruleName: string,
  category: string,
  checkFn: () => string[],
): RuleResult {
  return {
    rule: ruleName,
    category,
    violations: checkFn(),
  };
}
