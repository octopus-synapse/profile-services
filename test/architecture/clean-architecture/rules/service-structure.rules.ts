/**
 * Service Structure Rules
 *
 * Validates that services have proper Clean Architecture internal structure.
 */

import * as path from 'node:path';
import { CLEAN_ARCHITECTURE_MODULES, CLEAN_ARCHITECTURE_SERVICES } from '../constants';
import {
  directoryExists,
  fileExists,
  getFilesInDirectory,
  getSubdirectories,
  SOURCE_ROOT,
} from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

/**
 * Multiple sub-services are allowed when they are cohesive and related.
 * Uncle Bob's Clean Architecture allows multiple use-case groups within
 * a bounded context. Each sub-service MUST still follow Clean Architecture rules.
 */
export function checkNoMultipleSubServices(): RuleResult {
  return runRule(
    'sub-services within a module MUST each follow Clean Architecture patterns',
    'Service Structure',
    () => {
      const violations: string[] = [];
      for (const modulePath of CLEAN_ARCHITECTURE_MODULES) {
        const servicesPath = path.join(SOURCE_ROOT, modulePath, 'services');
        if (!directoryExists(servicesPath)) continue;

        const subdirs = getSubdirectories(servicesPath);
        const cleanArchSubdirs = subdirs.filter((dir) => {
          const useCasesPath = path.join(servicesPath, dir, 'use-cases');
          return directoryExists(useCasesPath);
        });

        // Each sub-service must have proper structure
        for (const subService of cleanArchSubdirs) {
          const subServicePath = path.join(servicesPath, subService);
          const hasUseCases = directoryExists(path.join(subServicePath, 'use-cases'));
          const hasPorts = directoryExists(path.join(subServicePath, 'ports'));

          if (hasUseCases && !hasPorts) {
            violations.push(
              `${modulePath}/services/${subService}: has use-cases/ but MISSING ports/ directory`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export function checkPortsDirectory(): RuleResult {
  return runRule('services MUST have ports/ directory', 'Service Structure', () => {
    const violations: string[] = [];
    for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
      const portsPath = path.join(SOURCE_ROOT, servicePath, 'ports');
      if (!directoryExists(portsPath)) {
        violations.push(`${servicePath}: MISSING ports/ directory`);
      }
    }
    return violations;
  });
}

export function checkRepositoryDirectory(): RuleResult {
  return runRule('services MUST have repository/ directory', 'Service Structure', () => {
    const violations: string[] = [];
    for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
      const repositoryPath = path.join(SOURCE_ROOT, servicePath, 'repository');
      if (!directoryExists(repositoryPath)) {
        violations.push(`${servicePath}: MISSING repository/ directory`);
      }
    }
    return violations;
  });
}

export function checkUseCasesDirectory(): RuleResult {
  return runRule('services MUST have use-cases/ directory', 'Service Structure', () => {
    const violations: string[] = [];
    for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
      const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
      if (!directoryExists(useCasesPath)) {
        violations.push(`${servicePath}: MISSING use-cases/ directory`);
      }
    }
    return violations;
  });
}

export function checkCompositionFile(): RuleResult {
  return runRule('services MUST have .composition.ts file', 'Service Structure', () => {
    const violations: string[] = [];
    for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
      const fullPath = path.join(SOURCE_ROOT, servicePath);
      const compositionFiles = getFilesInDirectory(fullPath, '.composition.ts');
      if (compositionFiles.length === 0) {
        violations.push(`${servicePath}: MISSING .composition.ts file`);
      }
    }
    return violations;
  });
}

export function checkFacadeService(): RuleResult {
  return runRule('services MUST have facade .service.ts file', 'Facade Service', () => {
    const violations: string[] = [];
    for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
      const parts = servicePath.split('/');
      const serviceName = parts[parts.length - 1];
      const parentServicesPath = path.join(SOURCE_ROOT, parts.slice(0, -1).join('/'));

      const facadeServiceFile = `${serviceName}.service.ts`;
      const facadeServicePath = path.join(parentServicesPath, facadeServiceFile);

      if (!fileExists(facadeServicePath)) {
        violations.push(`${servicePath}: MISSING facade service at services/${facadeServiceFile}`);
      }
    }
    return violations;
  });
}

export const serviceStructureRules = [
  checkNoMultipleSubServices,
  checkPortsDirectory,
  checkRepositoryDirectory,
  checkUseCasesDirectory,
  checkCompositionFile,
  checkFacadeService,
];
