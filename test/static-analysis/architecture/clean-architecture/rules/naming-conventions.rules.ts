/**
 * Hexagonal Architecture Naming Convention Rules
 *
 * Validates that all files follow the mandatory naming patterns:
 *   - Ports: *.port.ts
 *   - Repositories: *.repository.ts
 *   - Use Cases: *.use-case.ts
 *   - Services: *.service.ts
 *   - Controllers: *.controller.ts
 */

import * as path from 'node:path';
import { HEXAGONAL_MODULES } from '../constants';
import { directoryExists, getFilesInDirectory, readFileContent, SOURCE_ROOT } from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

export function checkPortFileNaming(): RuleResult {
  return runRule('port files MUST end with ".port.ts"', 'Naming Conventions', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const portsPath = path.join(SOURCE_ROOT, modulePath, 'domain', 'ports');
      if (!directoryExists(portsPath)) continue;

      const allFiles = getFilesInDirectory(portsPath, '.ts').filter((f) => f !== 'index.ts');
      const nonPortFiles = allFiles.filter((f) => !f.endsWith('.port.ts'));

      for (const file of nonPortFiles) {
        violations.push(
          `${modulePath}/domain/ports/${file}: DOES NOT follow ".port.ts" naming convention`,
        );
      }
    }
    return violations;
  });
}

export function checkRepositoryFileNaming(): RuleResult {
  return runRule(
    'persistence adapter files MUST end with ".repository.ts" or ".adapter.ts"',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      for (const modulePath of HEXAGONAL_MODULES) {
        const repoPath = path.join(
          SOURCE_ROOT,
          modulePath,
          'infrastructure',
          'adapters',
          'persistence',
        );
        if (!directoryExists(repoPath)) continue;

        const allFiles = getFilesInDirectory(repoPath, '.ts').filter((f) => f !== 'index.ts');
        // Allow .repository.ts, .adapter.ts, .service.ts, .spec.ts, index.ts
        const invalidFiles = allFiles.filter(
          (f) =>
            !f.endsWith('.repository.ts') &&
            !f.endsWith('.adapter.ts') &&
            !f.endsWith('.service.ts') &&
            !f.endsWith('.spec.ts') &&
            f !== 'index.ts',
        );

        for (const file of invalidFiles) {
          violations.push(
            `${modulePath}/infrastructure/adapters/persistence/${file}: DOES NOT follow adapter naming convention`,
          );
        }
      }
      return violations;
    },
  );
}

export function checkControllerFileNaming(): RuleResult {
  return runRule('controller files MUST end with ".controller.ts"', 'Naming Conventions', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const controllersPath = path.join(SOURCE_ROOT, modulePath, 'infrastructure', 'controllers');
      if (!directoryExists(controllersPath)) continue;

      const allFiles = getFilesInDirectory(controllersPath, '.ts').filter(
        (f) => f !== 'index.ts' && !f.endsWith('.spec.ts') && !f.endsWith('.dto.ts'), // DTOs are allowed in controllers for now
      );
      const invalidFiles = allFiles.filter((f) => !f.endsWith('.controller.ts'));

      for (const file of invalidFiles) {
        violations.push(
          `${modulePath}/infrastructure/controllers/${file}: DOES NOT follow ".controller.ts" naming convention`,
        );
      }
    }
    return violations;
  });
}

export function checkServiceFileNaming(): RuleResult {
  return runRule('service files MUST end with ".service.ts"', 'Naming Conventions', () => {
    const violations: string[] = [];
    for (const modulePath of HEXAGONAL_MODULES) {
      const servicesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'services');
      if (!directoryExists(servicesPath)) continue;

      const allFiles = getFilesInDirectory(servicesPath, '.ts').filter(
        (f) => f !== 'index.ts' && !f.endsWith('.spec.ts'),
      );
      const invalidFiles = allFiles.filter((f) => !f.endsWith('.service.ts'));

      for (const file of invalidFiles) {
        violations.push(
          `${modulePath}/application/services/${file}: DOES NOT follow ".service.ts" naming convention`,
        );
      }
    }
    return violations;
  });
}

export function checkPortInterfaceNaming(): RuleResult {
  return runRule(
    'port files MUST export interface/abstract class for abstractions',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      // Accept: interface I<Name>Port, interface <Name>Port, abstract class <Name>Port
      // Also accept: interface I<Name>Repository (common in ports)
      const portAbstractionRegex =
        /export\s+(interface|abstract\s+class)\s+(I?\w*(Port|Repository))\b/g;

      for (const modulePath of HEXAGONAL_MODULES) {
        const portsPath = path.join(SOURCE_ROOT, modulePath, 'domain', 'ports');
        if (!directoryExists(portsPath)) continue;

        const portFiles = getFilesInDirectory(portsPath, '.port.ts');
        for (const file of portFiles) {
          const content = readFileContent(path.join(portsPath, file));
          if (!content) continue;

          const hasPortAbstraction = portAbstractionRegex.test(content);
          portAbstractionRegex.lastIndex = 0;

          if (!hasPortAbstraction) {
            violations.push(
              `${modulePath}/domain/ports/${file}: MISSING port abstraction (interface/abstract class)`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export const namingConventionRules = [
  checkPortFileNaming,
  checkRepositoryFileNaming,
  checkControllerFileNaming,
  checkServiceFileNaming,
  checkPortInterfaceNaming,
];
