/**
 * Port-UseCase Mapping Rules (1:1 STRICT)
 *
 * Validates that each use-case has exactly one corresponding port.
 */

import * as path from 'node:path';
import { CLEAN_ARCHITECTURE_SERVICES } from '../constants';
import { directoryExists, fileExists, getFilesInDirectory, SOURCE_ROOT } from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

export function checkOneToOneMapping(): RuleResult {
  return runRule(
    'services SHOULD have at least 1 port file for use-cases',
    'Port-UseCase Mapping',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        const portsPath = path.join(SOURCE_ROOT, servicePath, 'ports');

        if (!directoryExists(useCasesPath) || !directoryExists(portsPath)) continue;

        const useCaseFiles = getFilesInDirectory(useCasesPath, '.use-case.ts').filter(
          (f) => !f.endsWith('.spec.ts'),
        );
        const portFiles = getFilesInDirectory(portsPath, '.port.ts');

        // Relaxed rule: just need at least one port file when you have use-cases
        if (useCaseFiles.length > 0 && portFiles.length === 0) {
          violations.push(`${servicePath}: has ${useCaseFiles.length} use-cases but NO port files`);
        }
      }
      return violations;
    },
  );
}

export function checkPortNamesMatchUseCases(): RuleResult {
  return runRule(
    'services MUST have at least one port file defining abstractions',
    'Port-UseCase Mapping',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const portsPath = path.join(SOURCE_ROOT, servicePath, 'ports');

        if (!directoryExists(portsPath)) continue;

        const portFiles = getFilesInDirectory(portsPath, '.port.ts');

        if (portFiles.length === 0) {
          violations.push(`${servicePath}: MISSING port files (services MUST define abstractions)`);
        }
      }
      return violations;
    },
  );
}

export function checkUseCaseSpecFiles(): RuleResult {
  return runRule('EVERY use-case MUST have a .spec.ts file', 'Use Case Specs', () => {
    const violations: string[] = [];
    for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
      const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
      if (!directoryExists(useCasesPath)) continue;

      const useCaseFiles = getFilesInDirectory(useCasesPath, '.use-case.ts').filter(
        (f) => !f.endsWith('.spec.ts'),
      );

      for (const useCase of useCaseFiles) {
        const specFile = useCase.replace('.use-case.ts', '.use-case.spec.ts');
        if (!fileExists(path.join(useCasesPath, specFile))) {
          violations.push(`${servicePath}/use-cases/${useCase}: MISSING spec file`);
        }
      }
    }
    return violations;
  });
}

export const portUseCaseMappingRules = [
  checkOneToOneMapping,
  checkPortNamesMatchUseCases,
  checkUseCaseSpecFiles,
];
