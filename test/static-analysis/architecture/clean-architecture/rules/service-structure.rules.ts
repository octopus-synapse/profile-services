/**
 * Hexagonal Architecture Service Structure Rules
 *
 * Validates that modules have proper internal structure:
 *   domain/ports/           - Outbound ports (repository interfaces)
 *   application/ports/      - Inbound ports
 *   application/services/   - Application services
 *   infrastructure/adapters/persistence/ - Repository implementations
 */

import * as path from 'node:path';
import { HEXAGONAL_MODULES } from '../constants';
import { directoryExists, getFilesInDirectory, SOURCE_ROOT } from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

export function checkDomainPortsDirectory(): RuleResult {
  return runRule('domain MUST have ports/ directory', 'Service Structure', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const fullPath = path.join(SOURCE_ROOT, modulePath, 'domain', 'ports');
      if (!directoryExists(fullPath)) {
        violations.push(`${modulePath}: MISSING domain/ports/ directory`);
      }
    }
    return violations;
  });
}

export function checkApplicationServicesOrUseCasesDirectory(): RuleResult {
  return runRule(
    'application MUST have services/ OR use-cases/ directory',
    'Service Structure',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        const servicesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'services');
        const useCasesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'use-cases');
        if (!directoryExists(servicesPath) && !directoryExists(useCasesPath)) {
          violations.push(`${modulePath}: MISSING application/services/ OR application/use-cases/`);
        }
      }
      return violations;
    },
  );
}

// Modules that don't need persistence (in-memory, cross-cutting, or external API only)
const MODULES_WITHOUT_PERSISTENCE = [
  'identity/account-lifecycle', // Uses other modules' repositories
  'identity/authentication', // Uses other modules' repositories
  'identity/authorization', // In-memory/cross-cutting
  'translation', // External API (LibreTranslate) - no database
  'ai', // External API (OpenAI) - no database
];

export function checkPersistenceAdaptersDirectory(): RuleResult {
  return runRule(
    'infrastructure/adapters MUST have persistence/ (except stateless modules)',
    'Service Structure',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        if (MODULES_WITHOUT_PERSISTENCE.includes(modulePath)) continue;
        const fullPath = path.join(
          SOURCE_ROOT,
          modulePath,
          'infrastructure',
          'adapters',
          'persistence',
        );
        if (!directoryExists(fullPath)) {
          violations.push(`${modulePath}: MISSING infrastructure/adapters/persistence/ directory`);
        }
      }
      return violations;
    },
  );
}

export function checkDomainPortFiles(): RuleResult {
  return runRule('domain/ports MUST have at least one .port.ts file', 'Service Structure', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const portsPath = path.join(SOURCE_ROOT, modulePath, 'domain', 'ports');
      if (!directoryExists(portsPath)) continue;

      const portFiles = getFilesInDirectory(portsPath, '.port.ts');
      if (portFiles.length === 0) {
        violations.push(`${modulePath}: domain/ports/ has NO .port.ts files`);
      }
    }
    return violations;
  });
}

export function checkRepositoryImplementations(): RuleResult {
  return runRule(
    'infrastructure/adapters/persistence MUST have repository implementations',
    'Service Structure',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        const persistencePath = path.join(
          SOURCE_ROOT,
          modulePath,
          'infrastructure',
          'adapters',
          'persistence',
        );
        if (!directoryExists(persistencePath)) continue;

        const repoFiles = getFilesInDirectory(persistencePath, '.repository.ts');
        if (repoFiles.length === 0) {
          violations.push(
            `${modulePath}: infrastructure/adapters/persistence/ has NO .repository.ts files`,
          );
        }
      }
      return violations;
    },
  );
}

export const serviceStructureRules = [
  checkDomainPortsDirectory,
  checkApplicationServicesOrUseCasesDirectory,
  checkPersistenceAdaptersDirectory,
  checkDomainPortFiles,
  checkRepositoryImplementations,
];
