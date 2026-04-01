/**
 * Hexagonal Architecture Port Mapping Rules
 *
 * Validates that:
 *   - domain/ports contains outbound ports (repository interfaces)
 *   - application/ports contains inbound ports (optional)
 *   - application/use-cases contains use cases (if applicable)
 */

import * as path from 'node:path';
import { HEXAGONAL_MODULES } from '../constants';
import { directoryExists, fileExists, getFilesInDirectory, SOURCE_ROOT } from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

export function checkDomainPortsExist(): RuleResult {
  return runRule('domain/ports MUST define repository abstractions', 'Port Mapping', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const portsPath = path.join(SOURCE_ROOT, modulePath, 'domain', 'ports');

      if (!directoryExists(portsPath)) continue;

      const portFiles = getFilesInDirectory(portsPath, '.port.ts');
      if (portFiles.length === 0) {
        violations.push(`${modulePath}: domain/ports/ has no port abstractions`);
      }
    }
    return violations;
  });
}

export function checkUseCaseSpecFiles(): RuleResult {
  return runRule('EVERY use-case MUST have a .spec.ts file', 'Use Case Specs', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const useCasesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'use-cases');
      if (!directoryExists(useCasesPath)) continue;

      const useCaseFiles = getFilesInDirectory(useCasesPath, '.use-case.ts').filter(
        (f) => !f.endsWith('.spec.ts'),
      );

      for (const useCase of useCaseFiles) {
        const specFile = useCase.replace('.use-case.ts', '.use-case.spec.ts');
        if (!fileExists(path.join(useCasesPath, specFile))) {
          violations.push(`${modulePath}/application/use-cases/${useCase}: MISSING spec file`);
        }
      }
    }
    return violations;
  });
}

export function checkServiceSpecFiles(): RuleResult {
  return runRule('EVERY service SHOULD have a .spec.ts file', 'Service Specs', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const servicesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'services');
      if (!directoryExists(servicesPath)) continue;

      const serviceFiles = getFilesInDirectory(servicesPath, '.service.ts').filter(
        (f) => !f.endsWith('.spec.ts'),
      );

      for (const service of serviceFiles) {
        const specFile = service.replace('.service.ts', '.service.spec.ts');
        if (!fileExists(path.join(servicesPath, specFile))) {
          violations.push(`${modulePath}/application/services/${service}: MISSING spec file`);
        }
      }
    }
    return violations;
  });
}

export const portUseCaseMappingRules = [
  checkDomainPortsExist,
  checkUseCaseSpecFiles,
  checkServiceSpecFiles,
];
