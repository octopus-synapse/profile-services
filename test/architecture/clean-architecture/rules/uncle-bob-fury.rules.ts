/**
 * Uncle Bob Fury Rules (MAXIMUM RIGOR)
 *
 * These are the STRICTEST rules based on Clean Architecture principles.
 * Uncle Bob is NOT HAPPY. He demands PERFECTION.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BOUNDED_CONTEXTS, CLEAN_ARCHITECTURE_SERVICES } from '../constants';
import {
  SOURCE_ROOT,
  directoryExists,
  getAllTypeScriptFiles,
  getFilesInDirectory,
  readFileContent,
} from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

const MAX_DEPENDENCIES = 4;
const MAX_USE_CASE_LINES = 150;
const MAX_PORT_METHODS = 5;

export function checkSingleResponsibilityPrinciple(): RuleResult {
  return runRule(
    `use-cases MUST have <= ${MAX_DEPENDENCIES} constructor dependencies (SRP)`,
    'Uncle Bob Fury - SRP',
    () => {
      const violations: string[] = [];
      const constructorRegex = /constructor\s*\(([^)]*)\)/gs;
      const paramRegex = /(?:private|public|protected|readonly)\s+\w+/g;

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        if (!directoryExists(useCasesPath)) continue;

        const useCaseFiles = getAllTypeScriptFiles(useCasesPath).filter(
          (f) => f.endsWith('.use-case.ts') && !f.endsWith('.spec.ts'),
        );

        for (const file of useCaseFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          const constructorMatch = constructorRegex.exec(content);
          constructorRegex.lastIndex = 0;

          if (constructorMatch) {
            const params = constructorMatch[1];
            const dependencies = (params.match(paramRegex) || []).length;

            if (dependencies > MAX_DEPENDENCIES) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: Has ${dependencies} dependencies (max ${MAX_DEPENDENCIES}) - VIOLATES SRP`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

export function checkUseCaseSize(): RuleResult {
  return runRule(
    `use-cases MUST be <= ${MAX_USE_CASE_LINES} lines (keep it focused!)`,
    'Uncle Bob Fury - SRP',
    () => {
      const violations: string[] = [];

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        if (!directoryExists(useCasesPath)) continue;

        const useCaseFiles = getAllTypeScriptFiles(useCasesPath).filter(
          (f) => f.endsWith('.use-case.ts') && !f.endsWith('.spec.ts'),
        );

        for (const file of useCaseFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          const lineCount = content.split('\n').length;
          if (lineCount > MAX_USE_CASE_LINES) {
            const relativePath = path.relative(SOURCE_ROOT, file);
            violations.push(
              `${relativePath}: Has ${lineCount} lines (max ${MAX_USE_CASE_LINES}) - TOO LARGE, split it!`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export function checkInterfaceSegregationPrinciple(): RuleResult {
  return runRule(
    `ports MUST have <= ${MAX_PORT_METHODS} methods (ISP)`,
    'Uncle Bob Fury - ISP',
    () => {
      const violations: string[] = [];
      const methodRegex =
        /^\s+\w+\s*\([^)]*\)\s*:\s*(?:Promise<)?[\w<>[\]|, ]+/gm;

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const portsPath = path.join(SOURCE_ROOT, servicePath, 'ports');
        if (!directoryExists(portsPath)) continue;

        const portFiles = getAllTypeScriptFiles(portsPath).filter((f) =>
          f.endsWith('.port.ts'),
        );

        for (const file of portFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          const methods = content.match(methodRegex) || [];
          if (methods.length > MAX_PORT_METHODS) {
            const relativePath = path.relative(SOURCE_ROOT, file);
            violations.push(
              `${relativePath}: Has ${methods.length} methods (max ${MAX_PORT_METHODS}) - VIOLATES ISP, split the interface!`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export function checkBoundedContextIsolation(): RuleResult {
  return runRule(
    'services MUST NOT import from other bounded contexts directly',
    'Uncle Bob Fury - Bounded Context',
    () => {
      const violations: string[] = [];

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const serviceFullPath = path.join(SOURCE_ROOT, servicePath);
        if (!directoryExists(serviceFullPath)) continue;

        // Extract the bounded context of this service
        // Path format: "resumes/resume-versions/services/resume-version"
        // parts[0] = bounded context (e.g., 'resumes')
        const parts = servicePath.split('/');
        const boundedContext = parts[0];

        const allFiles = getAllTypeScriptFiles(serviceFullPath);

        for (const file of allFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          // Check for imports from other bounded contexts
          for (const context of BOUNDED_CONTEXTS) {
            if (context === boundedContext) continue;

            const importPattern = new RegExp(
              `from\\s+['"].*bounded-contexts/${context}/`,
              'g',
            );
            if (importPattern.test(content)) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: Imports from bounded-context "${context}" - VIOLATES bounded context isolation!`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

export function checkNoCircularDependencies(): RuleResult {
  return runRule(
    'composition files MUST NOT have circular references',
    'Uncle Bob Fury - Acyclic',
    () => {
      const violations: string[] = [];

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const compositionsDir = path.join(
          SOURCE_ROOT,
          servicePath,
          'compositions',
        );
        if (!directoryExists(compositionsDir)) continue;

        const compositionFiles = getAllTypeScriptFiles(compositionsDir);
        for (const file of compositionFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          // Check for self-imports (simplistic circular check)
          const serviceName = servicePath.split('/').pop();
          const selfImportPattern = new RegExp(
            `from\\s+['"].*${serviceName}.*composition`,
            'g',
          );
          if (selfImportPattern.test(content)) {
            const relativePath = path.relative(SOURCE_ROOT, file);
            violations.push(
              `${relativePath}: Contains suspicious circular reference pattern`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export function checkNoEntityLeakage(): RuleResult {
  return runRule(
    'entities/domain objects MUST NOT leak to controllers',
    'Uncle Bob Fury - Layers',
    () => {
      const violations: string[] = [];

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const fullServicePath = path.join(SOURCE_ROOT, servicePath);
        const serviceRoot = path.dirname(fullServicePath);

        // Check controllers directory (should be at service level, not in Clean Architecture service)
        const controllersPath = path.join(serviceRoot, 'controllers');
        if (!directoryExists(controllersPath)) continue;

        const controllerFiles = getAllTypeScriptFiles(controllersPath);
        for (const file of controllerFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          // Check for direct entity imports
          const entityImportPattern = /from\s+['"].*\/entities\//g;
          if (entityImportPattern.test(content)) {
            const relativePath = path.relative(SOURCE_ROOT, file);
            violations.push(
              `${relativePath}: Controller imports entities directly - VIOLATES layer isolation!`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export function checkFacadeIsMinimal(): RuleResult {
  return runRule(
    'facade services MUST be thin wrappers (no business logic)',
    'Uncle Bob Fury - Facade',
    () => {
      const violations: string[] = [];
      const logicPatterns = [
        /if\s*\([^)]*\)\s*\{[\s\S]*return/g,
        /throw\s+new\s+\w+Exception/g,
        /catch\s*\([^)]*\)\s*\{[\s\S]*throw/g,
      ];

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const serviceName = servicePath.split('/').pop();
        const servicePath2 = path.join(
          SOURCE_ROOT,
          servicePath,
          `${serviceName}.service.ts`,
        );

        if (!fs.existsSync(servicePath2)) continue;

        const content = readFileContent(servicePath2);
        if (!content) continue;

        for (const pattern of logicPatterns) {
          if (pattern.test(content)) {
            const relativePath = path.relative(SOURCE_ROOT, servicePath2);
            violations.push(
              `${relativePath}: Contains business logic pattern - Facade MUST only delegate to use-cases!`,
            );
            pattern.lastIndex = 0;
            break;
          }
        }
      }
      return violations;
    },
  );
}

export function checkTestCoverage(): RuleResult {
  return runRule(
    'EVERY use-case MUST have corresponding unit tests',
    'Uncle Bob Fury - TDD',
    () => {
      const violations: string[] = [];

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        if (!directoryExists(useCasesPath)) continue;

        const useCaseFiles = getFilesInDirectory(
          useCasesPath,
          '.use-case.ts',
        ).filter((f) => !f.endsWith('.spec.ts'));
        const specFiles = getFilesInDirectory(useCasesPath, '.spec.ts');

        const useCaseNames = useCaseFiles.map((f) =>
          f.replace('.use-case.ts', ''),
        );
        const specNames = specFiles.map((f) =>
          f.replace('.use-case.spec.ts', ''),
        );

        for (const useCase of useCaseNames) {
          if (!specNames.includes(useCase)) {
            violations.push(
              `${servicePath}/use-cases/${useCase}.use-case.ts: MISSING test file!`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export const uncleBobFuryRules = [
  checkSingleResponsibilityPrinciple,
  checkUseCaseSize,
  checkInterfaceSegregationPrinciple,
  checkBoundedContextIsolation,
  checkNoCircularDependencies,
  checkNoEntityLeakage,
  checkFacadeIsMinimal,
  checkTestCoverage,
];
