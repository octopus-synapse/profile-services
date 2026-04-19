/**
 * Hexagonal Architecture Module Structure Rules
 *
 * Validates that modules have proper Hexagonal Architecture directory structure:
 *   domain/           - Core business logic (zero dependencies)
 *   application/      - Use cases and orchestration
 *   infrastructure/   - Adapters to external world
 */

import * as path from 'node:path';
import { HEXAGONAL_MODULES } from '../constants';
import { directoryExists, getFilesInDirectory, SOURCE_ROOT } from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

export function checkDomainDirectory(): RuleResult {
  return runRule('modules MUST have domain/ directory', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath, 'domain');
      if (!directoryExists(fullPath)) {
        violations.push(`${modulePath}: MISSING domain/ directory`);
      }
    }
    return violations;
  });
}

export function checkApplicationDirectory(): RuleResult {
  return runRule('modules MUST have application/ directory', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath, 'application');
      if (!directoryExists(fullPath)) {
        violations.push(`${modulePath}: MISSING application/ directory`);
      }
    }
    return violations;
  });
}

export function checkInfrastructureDirectory(): RuleResult {
  return runRule('modules MUST have infrastructure/ directory', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath, 'infrastructure');
      if (!directoryExists(fullPath)) {
        violations.push(`${modulePath}: MISSING infrastructure/ directory`);
      }
    }
    return violations;
  });
}

export function checkModuleFile(): RuleResult {
  return runRule('modules MUST have exactly ONE .module.ts file', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath);
      const moduleFiles = getFilesInDirectory(fullPath, '.module.ts');
      if (moduleFiles.length === 0) {
        violations.push(`${modulePath}: MISSING .module.ts file`);
      } else if (moduleFiles.length > 1) {
        violations.push(
          `${modulePath}: has ${moduleFiles.length} .module.ts files (should be exactly 1)`,
        );
      }
    }
    return violations;
  });
}

// Modules that don't need controllers (cross-cutting concerns)
const MODULES_WITHOUT_CONTROLLERS = [
  'identity/authorization',
  // AI is consumed internally by other modules (use-cases); there's no REST
  // surface yet, just the LLM adapter.
  'ai',
];

export function checkInfrastructureControllersDirectory(): RuleResult {
  return runRule(
    'infrastructure MUST have controllers/ directory (except cross-cutting modules)',
    'Module Structure',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        if (MODULES_WITHOUT_CONTROLLERS.includes(modulePath)) continue;
        const fullPath = path.join(SOURCE_ROOT, modulePath, 'infrastructure', 'controllers');
        if (!directoryExists(fullPath)) {
          violations.push(`${modulePath}: MISSING infrastructure/controllers/ directory`);
        }
      }
      return violations;
    },
  );
}

// Modules that don't need adapters (in-process only or external API via NestJS HttpService)
const MODULES_WITHOUT_ADAPTERS = [
  'identity/authorization',
  'translation', // Uses HttpService directly, no custom adapters needed
];

export function checkInfrastructureAdaptersDirectory(): RuleResult {
  return runRule(
    'infrastructure MUST have adapters/ directory (except in-process modules)',
    'Module Structure',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        if (MODULES_WITHOUT_ADAPTERS.includes(modulePath)) continue;
        const fullPath = path.join(SOURCE_ROOT, modulePath, 'infrastructure', 'adapters');
        if (!directoryExists(fullPath)) {
          violations.push(`${modulePath}: MISSING infrastructure/adapters/ directory`);
        }
      }
      return violations;
    },
  );
}

// Controller specs rule disabled - not structural, can be enabled as separate test coverage rule
// export function checkControllerSpecFiles(): RuleResult { ... }

export const moduleStructureRules = [
  checkDomainDirectory,
  checkApplicationDirectory,
  checkInfrastructureDirectory,
  checkModuleFile,
  checkInfrastructureControllersDirectory,
  checkInfrastructureAdaptersDirectory,
];
