/**
 * Uncle Bob Fury Rules (MAXIMUM RIGOR)
 *
 * These are the STRICTEST rules based on Clean Architecture principles.
 * Adapted for Hexagonal Architecture structure.
 */

import * as path from 'node:path';
import { BOUNDED_CONTEXTS, HEXAGONAL_MODULES } from '../constants';
import {
  directoryExists,
  getAllTypeScriptFiles,
  getFilesInDirectory,
  readFileContent,
  SOURCE_ROOT,
} from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

const MAX_DEPENDENCIES = 6;
const MAX_SERVICE_LINES = 300; // CLAUDE.md standard
const MAX_PORT_METHODS = 15; // Allow larger interfaces for repository ports

export function checkSingleResponsibilityPrinciple(): RuleResult {
  return runRule(
    `services MUST have <= ${MAX_DEPENDENCIES} constructor dependencies (SRP)`,
    'Uncle Bob Fury - SRP',
    () => {
      const violations: string[] = [];
      const constructorRegex = /constructor\s*\(([^)]*)\)/gs;
      const paramRegex = /(?:private|public|protected|readonly)\s+\w+/g;

      for (const modulePath of HEXAGONAL_MODULES) {
        const servicesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'services');
        if (!directoryExists(servicesPath)) continue;

        const serviceFiles = getAllTypeScriptFiles(servicesPath).filter(
          (f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'),
        );

        for (const file of serviceFiles) {
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

export function checkServiceSize(): RuleResult {
  return runRule(
    `services MUST be <= ${MAX_SERVICE_LINES} lines (keep it focused!)`,
    'Uncle Bob Fury - SRP',
    () => {
      const violations: string[] = [];

      for (const modulePath of HEXAGONAL_MODULES) {
        const servicesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'services');
        if (!directoryExists(servicesPath)) continue;

        const serviceFiles = getAllTypeScriptFiles(servicesPath).filter(
          (f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'),
        );

        for (const file of serviceFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          const lineCount = content.split('\n').length;
          if (lineCount > MAX_SERVICE_LINES) {
            const relativePath = path.relative(SOURCE_ROOT, file);
            violations.push(
              `${relativePath}: Has ${lineCount} lines (max ${MAX_SERVICE_LINES}) - TOO LARGE, split it!`,
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
      const methodRegex = /^\s+\w+\s*\([^)]*\)\s*:\s*(?:Promise<)?[\w<>[\]|, ]+/gm;

      for (const modulePath of HEXAGONAL_MODULES) {
        const portsPath = path.join(SOURCE_ROOT, modulePath, 'domain', 'ports');
        if (!directoryExists(portsPath)) continue;

        const portFiles = getAllTypeScriptFiles(portsPath).filter((f) => f.endsWith('.port.ts'));

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

// Shared contexts that can be imported from anywhere
// Note: 'resumes' is temporarily allowed as identity/users needs to fetch user resumes for public profile
const SHARED_CONTEXTS = ['platform', 'shared-kernel', 'resumes'];

// Paths within bounded contexts that are shared infrastructure (decorators, etc.)
const SHARED_PATHS = [
  'identity/shared-kernel', // @Public, @RequirePermission decorators
];

function isSharedPath(importPath: string): boolean {
  return SHARED_PATHS.some((sharedPath) => importPath.includes(`bounded-contexts/${sharedPath}`));
}

export function checkBoundedContextIsolation(): RuleResult {
  return runRule(
    'modules MUST NOT import from other bounded contexts (except shared)',
    'Uncle Bob Fury - Bounded Context',
    () => {
      const violations: string[] = [];

      for (const modulePath of HEXAGONAL_MODULES) {
        const fullPath = path.join(SOURCE_ROOT, modulePath);
        if (!directoryExists(fullPath)) continue;

        // Extract the bounded context of this module
        // Path format: "identity/users" -> boundedContext = "identity"
        const boundedContext = modulePath.split('/')[0];

        const allFiles = getAllTypeScriptFiles(fullPath);

        for (const file of allFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          // Check for imports from other bounded contexts
          for (const context of BOUNDED_CONTEXTS) {
            if (context === boundedContext) continue;
            if (SHARED_CONTEXTS.includes(context)) continue; // Allow shared contexts

            const importPattern = new RegExp(
              `from\\s+['"].*bounded-contexts/${context}/[^'"]+`,
              'g',
            );
            const matches = content.match(importPattern) || [];

            for (const match of matches) {
              // Skip if it's a shared path (like identity/shared-kernel)
              if (isSharedPath(match)) continue;

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

export function checkNoEntityLeakage(): RuleResult {
  return runRule('domain entities MUST NOT leak to controllers', 'Uncle Bob Fury - Layers', () => {
    const violations: string[] = [];

    for (const modulePath of HEXAGONAL_MODULES) {
      const controllersPath = path.join(SOURCE_ROOT, modulePath, 'infrastructure', 'controllers');
      if (!directoryExists(controllersPath)) continue;

      const controllerFiles = getAllTypeScriptFiles(controllersPath);
      for (const file of controllerFiles) {
        const content = readFileContent(file);
        if (!content) continue;

        // Check for direct entity imports
        const entityImportPattern = /from\s+['"].*\/domain\/entities\//g;
        if (entityImportPattern.test(content)) {
          const relativePath = path.relative(SOURCE_ROOT, file);
          violations.push(
            `${relativePath}: Controller imports domain entities directly - VIOLATES layer isolation!`,
          );
        }
      }
    }
    return violations;
  });
}

export function checkServiceTestCoverage(): RuleResult {
  return runRule(
    'EVERY service SHOULD have corresponding unit tests',
    'Uncle Bob Fury - TDD',
    () => {
      const violations: string[] = [];

      for (const modulePath of HEXAGONAL_MODULES) {
        const servicesPath = path.join(SOURCE_ROOT, modulePath, 'application', 'services');
        if (!directoryExists(servicesPath)) continue;

        const serviceFiles = getFilesInDirectory(servicesPath, '.service.ts').filter(
          (f) => !f.endsWith('.spec.ts'),
        );
        const specFiles = getFilesInDirectory(servicesPath, '.spec.ts');

        const serviceNames = serviceFiles.map((f) => f.replace('.service.ts', ''));
        const specNames = specFiles.map((f) => f.replace('.service.spec.ts', ''));

        for (const service of serviceNames) {
          if (!specNames.includes(service)) {
            violations.push(
              `${modulePath}/application/services/${service}.service.ts: MISSING test file!`,
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
  checkServiceSize,
  checkInterfaceSegregationPrinciple,
  checkBoundedContextIsolation,
  checkNoEntityLeakage,
  checkServiceTestCoverage,
];
