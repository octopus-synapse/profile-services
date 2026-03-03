/**
 * Naming Convention Rules (STRICT)
 *
 * Validates that all files follow the mandatory naming patterns.
 */

import * as path from 'node:path';
import { CLEAN_ARCHITECTURE_SERVICES } from '../constants';
import {
  SOURCE_ROOT,
  directoryExists,
  getFilesInDirectory,
  readFileContent,
} from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

export function checkPortFileNaming(): RuleResult {
  return runRule(
    'port files MUST end with ".port.ts"',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const portsPath = path.join(SOURCE_ROOT, servicePath, 'ports');
        if (!directoryExists(portsPath)) continue;

        const allFiles = getFilesInDirectory(portsPath, '.ts');
        const nonPortFiles = allFiles.filter((f) => !f.endsWith('.port.ts'));

        for (const file of nonPortFiles) {
          violations.push(
            `${servicePath}/ports/${file}: DOES NOT follow ".port.ts" naming convention`,
          );
        }
      }
      return violations;
    },
  );
}

export function checkUseCaseFileNaming(): RuleResult {
  return runRule(
    'use-case files MUST end with ".use-case.ts"',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        if (!directoryExists(useCasesPath)) continue;

        const allFiles = getFilesInDirectory(useCasesPath, '.ts');
        const invalidFiles = allFiles.filter(
          (f) =>
            !f.endsWith('.use-case.ts') &&
            !f.endsWith('.use-case.spec.ts') &&
            f !== 'index.ts',
        );

        for (const file of invalidFiles) {
          violations.push(
            `${servicePath}/use-cases/${file}: DOES NOT follow ".use-case.ts" naming convention`,
          );
        }
      }
      return violations;
    },
  );
}

export function checkRepositoryFileNaming(): RuleResult {
  return runRule(
    'repository files MUST end with ".repository.ts"',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const repoPath = path.join(SOURCE_ROOT, servicePath, 'repository');
        if (!directoryExists(repoPath)) continue;

        const allFiles = getFilesInDirectory(repoPath, '.ts');
        const invalidFiles = allFiles.filter(
          (f) => !f.endsWith('.repository.ts') && f !== 'index.ts',
        );

        for (const file of invalidFiles) {
          violations.push(
            `${servicePath}/repository/${file}: DOES NOT follow ".repository.ts" naming convention`,
          );
        }
      }
      return violations;
    },
  );
}

export function checkCompositionFileNaming(): RuleResult {
  return runRule(
    'composition file MUST be named "<service-name>.composition.ts"',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const serviceName = servicePath.split('/').pop();
        const compositionsDir = path.join(
          SOURCE_ROOT,
          servicePath,
          'compositions',
        );

        if (!directoryExists(compositionsDir)) continue;

        const compositionFiles = getFilesInDirectory(
          compositionsDir,
          '.composition.ts',
        );
        const expectedFileName = `${serviceName}.composition.ts`;

        if (!compositionFiles.includes(expectedFileName)) {
          violations.push(
            `${servicePath}/compositions: MISSING expected file "${expectedFileName}" (found: ${compositionFiles.join(', ') || 'none'})`,
          );
        }
      }
      return violations;
    },
  );
}

export function checkPortInterfaceNaming(): RuleResult {
  return runRule(
    'port files MUST have port abstraction (interface I<Name>Port or abstract class <Name>Port)',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      // Accept either interface I<Name>Port or abstract class <Name>Port
      const portInterfaceRegex = /export\s+interface\s+I\w+Port\b/g;
      const portAbstractClassRegex = /export\s+abstract\s+class\s+\w+Port\b/g;

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const portsPath = path.join(SOURCE_ROOT, servicePath, 'ports');
        if (!directoryExists(portsPath)) continue;

        const portFiles = getFilesInDirectory(portsPath, '.port.ts');
        for (const file of portFiles) {
          const content = readFileContent(path.join(portsPath, file));
          if (!content) continue;

          const hasInterface = portInterfaceRegex.test(content);
          portInterfaceRegex.lastIndex = 0;
          const hasAbstractClass = portAbstractClassRegex.test(content);
          portAbstractClassRegex.lastIndex = 0;

          if (!hasInterface && !hasAbstractClass) {
            violations.push(
              `${servicePath}/ports/${file}: MISSING port abstraction (interface I<Name>Port or abstract class <Name>Port)`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export function checkUseCaseClassNaming(): RuleResult {
  return runRule(
    'use-case classes MUST follow "<Name>UseCase" naming convention',
    'Naming Conventions',
    () => {
      const violations: string[] = [];
      const classRegex = /export\s+class\s+(\w+)/g;

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        if (!directoryExists(useCasesPath)) continue;

        const useCaseFiles = getFilesInDirectory(
          useCasesPath,
          '.use-case.ts',
        ).filter((f) => !f.endsWith('.spec.ts'));
        for (const file of useCaseFiles) {
          const content = readFileContent(path.join(useCasesPath, file));
          if (!content) continue;

          const matches = [...content.matchAll(classRegex)];
          for (const match of matches) {
            const className = match[1];
            if (!className.endsWith('UseCase')) {
              violations.push(
                `${servicePath}/use-cases/${file}: class "${className}" MUST follow "<Name>UseCase" convention`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

export const namingConventionRules = [
  checkPortFileNaming,
  checkUseCaseFileNaming,
  checkRepositoryFileNaming,
  checkCompositionFileNaming,
  checkPortInterfaceNaming,
  checkUseCaseClassNaming,
];
