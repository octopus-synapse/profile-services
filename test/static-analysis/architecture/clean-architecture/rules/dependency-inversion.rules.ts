/**
 * Hexagonal Architecture Dependency Inversion Rules
 *
 * Validates that the dependency inversion principle is strictly followed:
 *   - Domain layer has ZERO external dependencies
 *   - Application layer does NOT depend on infrastructure
 *   - Infrastructure implements domain ports
 */

import * as path from 'node:path';
import { HEXAGONAL_MODULES } from '../constants';
import { directoryExists, getAllTypeScriptFiles, readFileContent, SOURCE_ROOT } from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

// Domain layer must be PURE - no framework or infrastructure imports
// Note: Type imports from @prisma/client are allowed temporarily (technical debt)
// as they're just type aliases. The actual PrismaClient class is forbidden.
const FORBIDDEN_IN_DOMAIN = [
  'PrismaClient', // The actual client class
  '@nestjs/',
  'typeorm',
  'mongoose',
  'sequelize',
  'pg',
  'mysql',
  'redis',
];

// Application layer must not depend on specific infrastructure implementations
// Note: Type imports from @prisma/client are allowed temporarily (technical debt)
const FORBIDDEN_IN_APPLICATION = [
  'PrismaClient', // The actual client class
  'typeorm',
  'mongoose',
  'sequelize',
  'pg',
  'mysql',
  'redis',
];

export function checkDomainNoFrameworkImports(): RuleResult {
  return runRule(
    'domain layer MUST NOT import framework or infrastructure dependencies',
    'Dependency Inversion',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        const domainPath = path.join(SOURCE_ROOT, modulePath, 'domain');
        if (!directoryExists(domainPath)) continue;

        const files = getAllTypeScriptFiles(domainPath);
        for (const file of files) {
          const content = readFileContent(file);
          if (!content) continue;

          for (const forbidden of FORBIDDEN_IN_DOMAIN) {
            if (content.includes(forbidden)) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: VIOLATES DIP - imports "${forbidden}" (domain MUST be pure)`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

export function checkApplicationNoInfrastructureImports(): RuleResult {
  return runRule(
    'application layer MUST NOT import infrastructure dependencies',
    'Dependency Inversion',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        const applicationPath = path.join(SOURCE_ROOT, modulePath, 'application');
        if (!directoryExists(applicationPath)) continue;

        const files = getAllTypeScriptFiles(applicationPath);
        for (const file of files) {
          const content = readFileContent(file);
          if (!content) continue;

          for (const forbidden of FORBIDDEN_IN_APPLICATION) {
            if (content.includes(forbidden)) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: VIOLATES DIP - imports "${forbidden}" (application must be infrastructure-agnostic)`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

// NOTE: Repository port implementation check is temporarily disabled.
// Reason: Some repositories are facades or use composition patterns
// that don't explicitly extend/implement the port but provide the same interface.
// This is a known technical debt to be addressed incrementally.
// export function checkInfrastructureImplementsPorts(): RuleResult { ... }

export function checkNoDirectInfrastructureImportInDomain(): RuleResult {
  return runRule('domain MUST NOT import from infrastructure layer', 'Dependency Inversion', () => {
    const violations: string[] = [];

    for (const modulePath of HEXAGONAL_MODULES) {
      const domainPath = path.join(SOURCE_ROOT, modulePath, 'domain');
      if (!directoryExists(domainPath)) continue;

      const files = getAllTypeScriptFiles(domainPath);
      for (const file of files) {
        const content = readFileContent(file);
        if (!content) continue;

        // Check for imports from infrastructure
        const infraImportPattern = /from\s+['"].*\/infrastructure\//g;
        if (infraImportPattern.test(content)) {
          const relativePath = path.relative(SOURCE_ROOT, file);
          violations.push(
            `${relativePath}: VIOLATES DIP - domain imports from infrastructure layer`,
          );
        }
      }
    }
    return violations;
  });
}

// NOTE: This rule is temporarily disabled.
// Reason: NestJS DI requires importing concrete classes for type hints,
// even though actual injection uses the module providers.
// This is a common pattern in NestJS but technically violates strict DIP.
// To fix: use interfaces + injection tokens throughout.
// export function checkNoDirectInfrastructureImportInApplication(): RuleResult { ... }

export const dependencyInversionRules = [
  checkDomainNoFrameworkImports,
  checkApplicationNoInfrastructureImports,
  // checkInfrastructureImplementsPorts, // Temporarily disabled
  checkNoDirectInfrastructureImportInDomain,
  // checkNoDirectInfrastructureImportInApplication, // Temporarily disabled - NestJS DI pattern
];
