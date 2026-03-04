/**
 * Dependency Inversion Rules (NUCLEAR MODE)
 *
 * Validates that the dependency inversion principle is strictly followed.
 * NO EXCEPTIONS. NO MERCY.
 */

import * as path from 'node:path';
import { CLEAN_ARCHITECTURE_SERVICES } from '../constants';
import {
  SOURCE_ROOT,
  directoryExists,
  getAllTypeScriptFiles,
  readFileContent,
} from '../helpers';
import { type RuleResult, runRule } from '../rule-runner';

const FORBIDDEN_IMPORTS_IN_PORTS = [
  '@prisma/client',
  '@nestjs/',
  'typeorm',
  'mongoose',
  'sequelize',
  'pg',
  'mysql',
  'redis',
];

const FORBIDDEN_IMPORTS_IN_USE_CASES = [
  '@prisma/client',
  'typeorm',
  'mongoose',
  'sequelize',
  'pg',
  'mysql',
  'redis',
  '@nestjs/common',
  '@nestjs/swagger',
  '@nestjs/config',
  '@nestjs/passport',
];

const FORBIDDEN_NESTJS_DECORATORS = [
  '@Injectable',
  '@Controller',
  '@Get',
  '@Post',
  '@Put',
  '@Delete',
  '@Patch',
  '@Query',
  '@Param',
  '@Body',
  '@Res',
  '@Req',
];

export function checkPortsNoFrameworkImports(): RuleResult {
  return runRule(
    'ports MUST NOT import any framework or infrastructure dependencies',
    'Dependency Inversion',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const portsPath = path.join(SOURCE_ROOT, servicePath, 'ports');
        if (!directoryExists(portsPath)) continue;

        const portFiles = getAllTypeScriptFiles(portsPath);
        for (const file of portFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          for (const forbidden of FORBIDDEN_IMPORTS_IN_PORTS) {
            if (content.includes(forbidden)) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: VIOLATES DIP - imports "${forbidden}" (ports MUST be pure interfaces)`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

export function checkUseCasesNoInfrastructureImports(): RuleResult {
  return runRule(
    'use-cases MUST NOT import infrastructure dependencies',
    'Dependency Inversion',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        if (!directoryExists(useCasesPath)) continue;

        const useCaseFiles = getAllTypeScriptFiles(useCasesPath);
        for (const file of useCaseFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          for (const forbidden of FORBIDDEN_IMPORTS_IN_USE_CASES) {
            if (content.includes(forbidden)) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: VIOLATES DIP - imports "${forbidden}" (use-cases must be infrastructure-agnostic)`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

export function checkUseCasesNoNestJSDecorators(): RuleResult {
  return runRule(
    'use-cases MUST NOT use any NestJS decorators',
    'Framework Independence',
    () => {
      const violations: string[] = [];
      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const useCasesPath = path.join(SOURCE_ROOT, servicePath, 'use-cases');
        if (!directoryExists(useCasesPath)) continue;

        const useCaseFiles = getAllTypeScriptFiles(useCasesPath).filter(
          (f) => !f.endsWith('.spec.ts'),
        );
        for (const file of useCaseFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          for (const decorator of FORBIDDEN_NESTJS_DECORATORS) {
            // Match decorator usage (e.g., "@Injectable()" or "@Injectable")
            const decoratorRegex = new RegExp(`\\${decorator}\\s*\\(`, 'g');
            if (decoratorRegex.test(content)) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: Uses NestJS decorator "${decorator}" (use-cases MUST be framework-independent)`,
              );
            }
          }
        }
      }
      return violations;
    },
  );
}

export function checkRepositoryOnlyInfraImplementation(): RuleResult {
  return runRule(
    'repository files MUST implement/extend port abstraction',
    'Dependency Inversion',
    () => {
      const violations: string[] = [];
      // Accept either 'implements I<Name>Port' or 'extends <Name>Port' (for abstract class ports)
      const implementsInterfaceRegex = /implements\s+I?\w+Port/;
      const extendsAbstractClassRegex = /extends\s+\w+Port/;

      for (const servicePath of CLEAN_ARCHITECTURE_SERVICES) {
        const repoPath = path.join(SOURCE_ROOT, servicePath, 'repository');
        if (!directoryExists(repoPath)) continue;

        const repoFiles = getAllTypeScriptFiles(repoPath).filter((f) =>
          f.endsWith('.repository.ts'),
        );
        for (const file of repoFiles) {
          const content = readFileContent(file);
          if (!content) continue;

          const implementsPort = implementsInterfaceRegex.test(content);
          const extendsPort = extendsAbstractClassRegex.test(content);

          if (!implementsPort && !extendsPort) {
            const relativePath = path.relative(SOURCE_ROOT, file);
            violations.push(
              `${relativePath}: Repository MUST implement/extend a port abstraction`,
            );
          }
        }
      }
      return violations;
    },
  );
}

export function checkCompositionOnlyWiringNoLogic(): RuleResult {
  return runRule(
    'composition files MUST only wire dependencies, no business logic',
    'Dependency Inversion',
    () => {
      const violations: string[] = [];
      const businessLogicPatterns = [
        /if\s*\(/g,
        /for\s*\(/g,
        /while\s*\(/g,
        /switch\s*\(/g,
        /\.map\s*\(/g,
        /\.filter\s*\(/g,
        /\.reduce\s*\(/g,
        /try\s*\{/g,
      ];

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

          for (const pattern of businessLogicPatterns) {
            if (pattern.test(content)) {
              const relativePath = path.relative(SOURCE_ROOT, file);
              violations.push(
                `${relativePath}: Contains business logic pattern "${pattern.source}" (compositions MUST only wire dependencies)`,
              );
              pattern.lastIndex = 0; // Reset regex state
              break;
            }
          }
        }
      }
      return violations;
    },
  );
}

export const dependencyInversionRules = [
  checkPortsNoFrameworkImports,
  checkUseCasesNoInfrastructureImports,
  checkUseCasesNoNestJSDecorators,
  checkRepositoryOnlyInfraImplementation,
  checkCompositionOnlyWiringNoLogic,
];
