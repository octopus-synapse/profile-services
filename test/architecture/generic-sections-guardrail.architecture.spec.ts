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
 * Hardcoded semantic kinds that should NOT appear as string literals in code.
 * Code should use pattern matching or database definitions, not hardcoded strings.
 *
 * EXCEPTION: Comments, documentation, and regex patterns are allowed.
 *
 * NOTE: 'LANGUAGE' and 'CERTIFICATION' are NOT included because they are also
 * valid skill type categories in the skills catalog (different domain).
 */
const FORBIDDEN_SEMANTIC_KIND_LITERALS = [
  'WORK_EXPERIENCE',
  'SKILL_SET',
  'PROJECT',
  'AWARD',
  'INTEREST',
  'RECOMMENDATION',
  'PUBLICATION',
  'TALK',
  'HACKATHON',
  'BUG_BOUNTY',
  'OPEN_SOURCE',
  'ACHIEVEMENT',
];

/**
 * Paths where hardcoded semantic kinds are allowed:
 * - Seeds and migrations (database setup)
 * - Type definitions and examples
 * - This architecture test itself
 */
const ALLOWED_SEMANTIC_KIND_PATHS = [
  '/prisma/seeds/',
  '/prisma/migrations/',
  '/shared-kernel/types/generic-section.types.ts', // Example docs
  '/shared-kernel/ast/generic-section-data.schema.ts', // Example docs
  '/test/architecture/', // This test
  '/bounded-contexts/presentation/themes/validators/', // Theme config seeds
  '/shared-kernel/dtos/sdk-response.dto.ts', // @ApiProperty examples for Swagger
  '/bounded-contexts/integration/', // Integration semantic mappings (GitHub → OPEN_SOURCE, etc.)
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

function isAllowedSemanticKindPath(filePath: string): boolean {
  return ALLOWED_SEMANTIC_KIND_PATHS.some((allowedPath) =>
    filePath.includes(allowedPath),
  );
}

/**
 * Check if a line contains a semantic kind as a string literal (not in comment/regex).
 */
function containsSemanticKindLiteral(line: string, kind: string): boolean {
  // Skip comments
  if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) {
    return false;
  }

  // Skip regex patterns (e.g., /skill/i)
  if (line.includes('/') && line.includes('/i')) {
    return false;
  }

  // Check for string literal usage: 'KIND' or "KIND"
  return line.includes(`'${kind}'`) || line.includes(`"${kind}"`);
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

  it('forbids hardcoded semantic kind string literals in production code', () => {
    const violations: string[] = [];
    const sourceFiles = listProductionFiles(SOURCE_ROOT);

    for (const filePath of sourceFiles) {
      if (isAllowedSemanticKindPath(filePath)) {
        continue;
      }

      const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

      for (const [index, line] of lines.entries()) {
        for (const kind of FORBIDDEN_SEMANTIC_KIND_LITERALS) {
          if (containsSemanticKindLiteral(line, kind)) {
            violations.push(
              `${filePath}:${index + 1} contains hardcoded semantic kind '${kind}' - use pattern matching or DB definitions instead`,
            );
          }
        }
      }
    }

    // Report all violations for visibility
    if (violations.length > 0) {
      console.warn(
        `\n⚠️  Found ${violations.length} hardcoded semantic kinds:`,
      );
      for (const v of violations.slice(0, 10)) {
        console.warn(`  - ${v}`);
      }
      if (violations.length > 10) {
        console.warn(`  ... and ${violations.length - 10} more`);
      }
    }

    // Strict mode enabled - no hardcoded semantic kinds allowed
    expect(violations).toEqual([]);
  });

  it('forbids importing deleted legacy section schemas', () => {
    const violations: string[] = [];
    const sourceFiles = listProductionFiles(SOURCE_ROOT);

    const DELETED_SCHEMA_FILES = [
      'experience.schema',
      'education.schema',
      'skill.schema',
      'language.schema',
      'certification.schema',
      'project.schema',
      'award.schema',
      'bug-bounty.schema',
      'hackathon.schema',
      'interest.schema',
      'open-source.schema',
      'publication.schema',
      'recommendation.schema',
      'talk.schema',
    ];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');

      for (const schemaFile of DELETED_SCHEMA_FILES) {
        if (
          content.includes(`from './${schemaFile}'`) ||
          content.includes(`from "./${schemaFile}"`) ||
          content.includes(`from '${schemaFile}'`) ||
          content.includes(`from "${schemaFile}"`)
        ) {
          violations.push(
            `${filePath} imports deleted schema file '${schemaFile}' - use GenericSectionDataSchema instead`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
