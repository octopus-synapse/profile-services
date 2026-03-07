/**
 * Module Structure Rules
 *
 * Validates that modules have proper Clean Architecture directory structure.
 */

import * as path from 'node:path';
import { CLEAN_ARCHITECTURE_MODULES } from '../constants';
import { directoryExists, fileExists, getFilesInDirectory, SOURCE_ROOT } from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

export function checkControllersDirectory(): RuleResult {
  return runRule('modules MUST have controllers/ directory', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of CLEAN_ARCHITECTURE_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath, 'controllers');
      if (!directoryExists(fullPath)) {
        violations.push(`${modulePath}: MISSING controllers/ directory`);
      }
    }
    return violations;
  });
}

export function checkDtoDirectory(): RuleResult {
  return runRule('modules MUST have dto/ directory', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of CLEAN_ARCHITECTURE_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath, 'dto');
      if (!directoryExists(fullPath)) {
        violations.push(`${modulePath}: MISSING dto/ directory`);
      }
    }
    return violations;
  });
}

export function checkServicesDirectory(): RuleResult {
  return runRule('modules MUST have services/ directory', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of CLEAN_ARCHITECTURE_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath, 'services');
      if (!directoryExists(fullPath)) {
        violations.push(`${modulePath}: MISSING services/ directory`);
      }
    }
    return violations;
  });
}

export function checkModuleFile(): RuleResult {
  return runRule('modules MUST have exactly ONE .module.ts file', 'Module Structure', () => {
    const violations: string[] = [];
    for (const modulePath of CLEAN_ARCHITECTURE_MODULES) {
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

export function checkControllerSpecFiles(): RuleResult {
  return runRule('EVERY controller MUST have a .spec.ts file', 'Controller Specs', () => {
    const violations: string[] = [];
    for (const modulePath of CLEAN_ARCHITECTURE_MODULES) {
      const controllersPath = path.join(SOURCE_ROOT, modulePath, 'controllers');
      if (!directoryExists(controllersPath)) continue;

      const controllerFiles = getFilesInDirectory(controllersPath, '.controller.ts').filter(
        (f) => !f.endsWith('.spec.ts'),
      );

      for (const controller of controllerFiles) {
        const specFile = controller.replace('.controller.ts', '.controller.spec.ts');
        if (!fileExists(path.join(controllersPath, specFile))) {
          violations.push(`${modulePath}/controllers/${controller}: MISSING spec file`);
        }
      }
    }
    return violations;
  });
}

export const moduleStructureRules = [
  checkControllersDirectory,
  checkDtoDirectory,
  checkServicesDirectory,
  checkModuleFile,
  checkControllerSpecFiles,
];
