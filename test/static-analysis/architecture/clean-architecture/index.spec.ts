/**
 * Hexagonal Architecture Test Orchestrator
 *
 * MIGRATED modules: violations = ERROR (test fails)
 * PENDING modules: violations = WARNING (logged, test passes)
 *
 * Run with: bun test test/architecture/clean-architecture/index.spec.ts
 */

import { beforeAll, describe, expect, test } from 'bun:test';
import { MIGRATED_MODULES, PENDING_MODULES } from './constants';
import { type RuleResult } from './rule-runner';
import { dependencyInversionRules } from './rules/dependency-inversion.rules';
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

/**
 * Check if a violation is from a migrated module (ERROR) or pending (WARNING)
 */
function isFromMigratedModule(violation: string): boolean {
  return MIGRATED_MODULES.some(
    (mod) => violation.startsWith(mod) || violation.includes(`/${mod}/`),
  );
}

function isFromPendingModule(violation: string): boolean {
  return PENDING_MODULES.some((mod) => violation.startsWith(mod) || violation.includes(`/${mod}/`));
}

function separateViolations(violations: string[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const v of violations) {
    if (isFromMigratedModule(v)) {
      errors.push(v);
    } else if (isFromPendingModule(v)) {
      warnings.push(v);
    } else {
      // Unknown module - treat as error to be safe
      errors.push(v);
    }
  }

  return { errors, warnings };
}

// Store all results for final aggregation
let allResults: RuleResult[] = [];

describe('🏛️ HEXAGONAL ARCHITECTURE VALIDATION', () => {
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
          const { errors, warnings } = separateViolations(result.violations);

          // Log warnings (pending modules)
          if (warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS - pending migration (${warnings.length}):`);
            for (const w of warnings.slice(0, 3)) {
              console.log(`   ⏳ ${w}`);
            }
            if (warnings.length > 3) {
              console.log(`   ... and ${warnings.length - 3} more pending`);
            }
          }

          // Log errors (migrated modules)
          if (errors.length > 0) {
            console.log(`\n❌ ERRORS - migrated modules (${errors.length}):`);
            for (const e of errors) {
              console.log(`   💥 ${e}`);
            }
          }

          // Only fail on errors (migrated modules)
          expect(errors).toEqual([]);
        });
      }
    });
  }
});

// Summary test that aggregates all violations
describe('📊 ARCHITECTURE SUMMARY', () => {
  test('migrated modules should have ZERO violations', () => {
    const finalResults = ALL_RULES.map((rule) => rule());

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of finalResults) {
      const { errors, warnings } = separateViolations(result.violations);
      totalErrors += errors.length;
      totalWarnings += warnings.length;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('🏛️  HEXAGONAL ARCHITECTURE SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Migrated modules: ${MIGRATED_MODULES.length}`);
    console.log(`⏳ Pending modules:  ${PENDING_MODULES.length}`);
    console.log('─'.repeat(80));
    console.log(`❌ ERRORS (migrated):  ${totalErrors}`);
    console.log(`⚠️  WARNINGS (pending): ${totalWarnings}`);
    console.log('='.repeat(80));

    if (totalWarnings > 0) {
      console.log('\n📋 PENDING MIGRATIONS:');
      for (const mod of PENDING_MODULES) {
        console.log(`   ⏳ ${mod}`);
      }
    }

    // Only fail on errors from migrated modules
    expect(totalErrors).toBe(0);
  });
});
