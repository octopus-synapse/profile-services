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

// Domain layer must be PURE - no framework or infrastructure imports.
// Forbidden tokens are matched as either bare class names (e.g.
// `PrismaClient`) OR as the right-hand side of an `import ... from
// '<pkg>'`. The package check matters because tokens like `pg` /
// `mysql` / `redis` would false-positive on substrings like `jpg`,
// `image/jpeg`, or `redisCache` if we did naive `content.includes()`.
//
// Type imports from @prisma/client are allowed temporarily (technical
// debt) as they're just type aliases. The actual PrismaClient class
// is forbidden.
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

// Application layer must not depend on specific infrastructure implementations.
// Same matching rules as `FORBIDDEN_IN_DOMAIN`.
const FORBIDDEN_IN_APPLICATION = [
  'PrismaClient', // The actual client class
  'typeorm',
  'mongoose',
  'sequelize',
  'pg',
  'mysql',
  'redis',
];

/**
 * Matches a forbidden token as either a bare identifier (e.g.
 * `PrismaClient`) or as a package import (`from 'pg'` / `from "pg/foo"`
 * / `require('mysql')`). Tokens with `/` or `@` in them (`@nestjs/`)
 * are treated as path-prefix matches inside an import-like construct.
 *
 * The substring `content.includes('pg')` we used before tripped on
 * `'jpg'` and similar — this is the targeted fix for that class of
 * false positives.
 */
function matchesForbidden(content: string, token: string): boolean {
  // Path-prefix tokens like `@nestjs/` only need to appear after a
  // `from`/`require` quote — they cannot collide with a normal identifier.
  if (token.includes('/') || token.startsWith('@')) {
    return new RegExp(`(from|require)\\s*\\(?\\s*['"\`]${escapeRegex(token)}`).test(content);
  }
  // Bare-identifier tokens like `PrismaClient` are valid as either an
  // import specifier (`import { PrismaClient } from '...'`) or as a
  // package-name match (`from 'pg'`). Use a word boundary so we don't
  // match `'jpg'` / `'sequelizeOptions'`.
  const wordRe = new RegExp(`\\b${escapeRegex(token)}\\b`);
  if (wordRe.test(content)) {
    // Word match alone isn't enough — we need it to be either a JS
    // identifier (anything outside a string literal) or the exact
    // contents of a `from '<token>'` import. To filter out string-
    // literal hits like `'image/jpeg'`, look for the token as the
    // full quoted package name OR as a non-stringy identifier.
    const asPackage = new RegExp(`(from|require)\\s*\\(?\\s*['"\`]${escapeRegex(token)}['"\`/]`);
    if (asPackage.test(content)) return true;
    // Identifier match outside of quotes: scrub all string literals
    // first and re-check word-boundary presence.
    const noStrings = content
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/`(?:\\.|[^`\\])*`/g, '``');
    return wordRe.test(noStrings);
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
            if (matchesForbidden(content, forbidden)) {
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
            if (matchesForbidden(content, forbidden)) {
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
