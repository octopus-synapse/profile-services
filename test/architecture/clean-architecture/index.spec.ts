/**
 * Clean Architecture Test Orchestrator
 *
 * This file imports all rule modules and orchestrates the execution
 * of all architecture validation rules with a total violation count.
 *
 * Run with: bun test test/architecture/clean-architecture/index.spec.ts
 */

import { beforeAll, describe, expect, test } from 'bun:test';
import { type RuleResult } from './rule-runner';
import { dependencyInversionRules } from './rules/dependency-inversion.rules';
// Import all rule modules
import { moduleStructureRules } from './rules/module-structure.rules';
import { namingConventionRules } from './rules/naming-conventions.rules';
import { portUseCaseMappingRules } from './rules/port-usecase-mapping.rules';
import { serviceStructureRules } from './rules/service-structure.rules';
import { uncleBobFuryRules } from './rules/uncle-bob-fury.rules';

// Aggregate all rules
const ALL_RULES: (() => RuleResult)[] = [
  ...moduleStructureRules,
  ...serviceStructureRules,
  ...portUseCaseMappingRules,
  ...namingConventionRules,
  ...dependencyInversionRules,
  ...uncleBobFuryRules,
];

// Categorize rules for organized reporting
const RULE_CATEGORIES = {
  'Module Structure': moduleStructureRules,
  'Service Structure': serviceStructureRules,
  'Port-UseCase Mapping': portUseCaseMappingRules,
  'Naming Conventions': namingConventionRules,
  'Dependency Inversion': dependencyInversionRules,
  'Uncle Bob Fury': uncleBobFuryRules,
};

// Store all results for final aggregation
let allResults: RuleResult[] = [];

describe('🏛️ CLEAN ARCHITECTURE VALIDATION', () => {
  beforeAll(() => {
    allResults = [];
  });

  // Run each category as a separate describe block
  for (const [categoryName, rules] of Object.entries(RULE_CATEGORIES)) {
    describe(`📋 ${categoryName}`, () => {
      for (const rule of rules) {
        const result = rule();
        allResults.push(result);

        test(result.rule, () => {
          if (result.violations.length > 0) {
            console.log(`\n❌ VIOLATIONS (${result.violations.length}):`);
            for (const v of result.violations) {
              console.log(`   • ${v}`);
            }
          }
          expect(result.violations).toEqual([]);
        });
      }
    });
  }
});

// Summary test that aggregates all violations
describe('📊 TOTAL VIOLATION COUNT', () => {
  test('should have ZERO violations across all rules', () => {
    // Re-run all rules for final count
    const finalResults = ALL_RULES.map((rule) => rule());
    const totalViolations = finalResults.reduce((sum, r) => sum + r.violations.length, 0);
    const failingRules = finalResults.filter((r) => r.violations.length > 0);

    console.log(`\n${'='.repeat(80)}`);
    console.log('🏛️  CLEAN ARCHITECTURE SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Total Rules Executed: ${finalResults.length}`);
    console.log(`❌ Failing Rules: ${failingRules.length}`);
    console.log(`🔥 TOTAL VIOLATIONS: ${totalViolations}`);
    console.log('='.repeat(80));

    if (failingRules.length > 0) {
      console.log('\n💀 FAILING RULES BREAKDOWN:');
      for (const result of failingRules) {
        console.log(`\n   [${result.category}] ${result.rule}`);
        console.log(`   Violations: ${result.violations.length}`);
        for (const v of result.violations.slice(0, 5)) {
          console.log(`      • ${v}`);
        }
        if (result.violations.length > 5) {
          console.log(`      ... and ${result.violations.length - 5} more`);
        }
      }
    }

    expect(totalViolations).toBe(0);
  });
});
