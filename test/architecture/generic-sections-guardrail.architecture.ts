import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';

const LEGACY_PRISMA_MODELS = new Set([
  'Experience',
  'Education',
  'Skill',
  'Language',
  'Project',
  'Certification',
]);

const LEGACY_PRISMA_DELEGATES = [
  'prisma.experience',
  'prisma.education',
  'prisma.skill',
  'prisma.language',
  'prisma.project',
  'prisma.certification',
];

/**
 * Legacy GraphQL inputs have been REMOVED.
 * Domain-specific inputs (CreateExperienceInput, etc.) no longer exist.
 * All section operations must use the generic sections API.
 */

/**
 * Patterns that indicate new domain-specific GraphQL inputs being created
 * These should be blocked in favor of generic sections API.
 */
const FORBIDDEN_NEW_INPUT_PATTERNS = [
  /Create(?!SectionItem).*Input/,
  /Update(?!SectionItem).*Input/,
];

const ALLOWED_LEGACY_PATHS = [
  '/bounded-contexts/integration/',
  '/bounded-contexts/onboarding/',
  '/bounded-contexts/import/',
];

function listProductionFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...listProductionFiles(absolutePath));
      continue;
    }

    if (!entry.isFile() || !absolutePath.endsWith('.ts')) {
      continue;
    }

    if (
      absolutePath.endsWith('.spec.ts') ||
      absolutePath.endsWith('.test.ts') ||
      absolutePath.endsWith('.d.ts')
    ) {
      continue;
    }

    files.push(absolutePath.replace(/\\/g, '/'));
  }

  return files;
}

function isAllowedLegacyPath(filePath: string): boolean {
  return ALLOWED_LEGACY_PATHS.some((allowedPath) =>
    filePath.includes(allowedPath),
  );
}

describe('Architecture - Generic Sections Guardrail', () => {
  it('forbids importing removed legacy Prisma section models', () => {
    const violations: string[] = [];
    const sourceFiles = listProductionFiles(SOURCE_ROOT);

    for (const filePath of sourceFiles) {
      if (isAllowedLegacyPath(filePath)) {
        continue;
      }

      const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

      for (const [index, line] of lines.entries()) {
        if (
          !line.includes("from '@prisma/client'") &&
          !line.includes('from "@prisma/client"')
        ) {
          continue;
        }

        for (const modelName of LEGACY_PRISMA_MODELS) {
          if (line.includes(modelName)) {
            violations.push(
              `${filePath}:${index + 1} imports removed legacy Prisma model ${modelName}`,
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('forbids usage of removed legacy Prisma delegates', () => {
    const violations: string[] = [];
    const sourceFiles = listProductionFiles(SOURCE_ROOT);

    for (const filePath of sourceFiles) {
      if (isAllowedLegacyPath(filePath)) {
        continue;
      }

      const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

      for (const [index, line] of lines.entries()) {
        const normalizedLine = line.replace(/\s+/g, '');

        for (const delegate of LEGACY_PRISMA_DELEGATES) {
          if (normalizedLine.includes(delegate)) {
            violations.push(
              `${filePath}:${index + 1} uses removed legacy Prisma delegate ${delegate}`,
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('forbids creating new domain-specific GraphQL inputs (use generic sections API)', () => {
    const violations: string[] = [];
    const graphqlInputsPath = 'src/bounded-contexts/platform/graphql/inputs';

    if (!fs.existsSync(graphqlInputsPath)) {
      return; // Skip if path doesn't exist (inputs directory is empty/removed)
    }

    const inputFiles = fs.readdirSync(graphqlInputsPath);

    for (const file of inputFiles) {
      if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) {
        continue;
      }

      const filePath = path.join(graphqlInputsPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Find all @InputType() class declarations
      const inputTypeMatches = content.matchAll(
        /@InputType\([^)]*\)\s*export\s+class\s+(\w+)/g,
      );

      for (const match of inputTypeMatches) {
        const inputName = match[1];

        // Check if it's a forbidden new domain-specific input
        // ALL domain-specific inputs are now forbidden - use generic sections API
        for (const pattern of FORBIDDEN_NEW_INPUT_PATTERNS) {
          if (pattern.test(inputName) && !inputName.includes('SectionItem')) {
            violations.push(
              `${filePath}: New domain-specific input '${inputName}' should use generic sections API instead`,
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
