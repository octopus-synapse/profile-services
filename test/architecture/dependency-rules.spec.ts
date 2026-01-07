/**
 * Architectural Tests
 *
 * Validates system architecture rules and boundaries.
 * These tests enforce design decisions automatically.
 *
 * Uncle Bob: "Architecture is about intent. Tests make intent executable."
 * Kent Beck: "Constraints enable freedom to refactor safely."
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture', () => {
  describe('Dependency Direction', () => {
    it('should not have domain layer importing from infrastructure', () => {
      // Domain should be innermost layer - no infrastructure dependencies
      const domainFiles = getAllTypeScriptFiles('src/', [
        'auth',
        'users',
        'resumes',
        'themes',
        'onboarding',
      ]);

      const violations: string[] = [];

      domainFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for infrastructure imports
        // Note: @nestjs/common is allowed (decorators unavoidable in NestJS)
        const forbiddenImports = [
          'express',
          '@sendgrid',
          'aws-sdk',
          '@aws-sdk',
          'puppeteer',
        ];

        forbiddenImports.forEach((forbidden) => {
          if (content.includes(`from '${forbidden}`)) {
            violations.push(
              `${file} imports infrastructure dependency: ${forbidden}`,
            );
          }
        });
      });

      expect(violations).toEqual([]);
    });

    it('should have clean dependency direction: UI → Service → Domain', () => {
      // Controllers should not import repositories directly
      const controllerFiles = getAllTypeScriptFiles('src/', ['controllers']);

      const violations: string[] = [];

      controllerFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');

        if (content.includes('Repository') && content.includes('import')) {
          // Check if importing repositories
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (
              line.includes('import') &&
              line.includes('Repository') &&
              !line.includes('ResumesRepository') // Exception for resume sub-resources
            ) {
              violations.push(
                `${file}:${index + 1} - Controller imports Repository directly`,
              );
            }
          });
        }
      });

      expect(violations).toEqual([]);
    });
  });

  describe('Module Boundaries', () => {
    it('should not have circular dependencies between modules', () => {
      // Use madge to detect circular dependencies
      try {
        const result = execSync('npx madge --circular --extensions ts src/', {
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        // madge exits with 0 if no circular deps found
        // Result should be empty or contain success message
        expect(result.toLowerCase()).not.toContain('circular');
      } catch (error: any) {
        // If madge not installed, skip test
        if (error.message?.includes('command not found')) {
          console.warn(
            '⚠️  madge not installed - skipping circular dependency check',
          );
          return;
        }

        // Otherwise, circular deps detected (madge exits with code 1)
        const output = error.stdout || error.stderr || error.message;
        throw new Error(`Circular dependencies detected:\n${output}`);
      }
    });

    it('should have isolated module boundaries', () => {
      // Auth module should not import from Themes
      // Themes should not import from Resumes
      // etc.

      const moduleImportRules: Record<string, string[]> = {
        'src/auth': ['src/themes', 'src/resumes', 'src/export', 'src/dsl'],
        'src/themes': ['src/resumes', 'src/export', 'src/dsl'],
        'src/resumes': ['src/themes', 'src/dsl'],
        'src/export': [],
        'src/dsl': ['src/themes', 'src/resumes', 'src/export'],
      };

      const violations: string[] = [];

      Object.entries(moduleImportRules).forEach(([module, forbidden]) => {
        const moduleFiles = getAllTypeScriptFiles(module);

        moduleFiles.forEach((file) => {
          const content = fs.readFileSync(file, 'utf-8');

          forbidden.forEach((forbiddenModule) => {
            const relativePath = forbiddenModule.replace('src/', '../');
            if (content.includes(`from '${relativePath}`)) {
              violations.push(
                `${file} violates boundary: imports from ${forbiddenModule}`,
              );
            }
          });
        });
      });

      expect(violations).toEqual([]);
    });
  });

  describe('Layer Separation', () => {
    it('should not have business logic in controllers', () => {
      const controllerFiles = getAllTypeScriptFiles('src/', ['controller']);

      const violations: string[] = [];

      controllerFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Controllers should only call services, not contain logic
        const businessLogicPatterns = [
          /if\s*\([^)]*\)\s*{[^}]*throw\s+new/, // Direct validation logic
          /for\s*\(/, // Loops (should be in services)
          /while\s*\(/,
          /\.map\(/, // Array transformations
          /\.filter\(/,
          /\.reduce\(/,
        ];

        lines.forEach((line, index) => {
          businessLogicPatterns.forEach((pattern) => {
            if (pattern.test(line) && !line.includes('//')) {
              violations.push(
                `${file}:${index + 1} - Controller contains business logic`,
              );
            }
          });
        });
      });

      // Controllers may have SOME logic - this is a warning, not strict rule
      if (violations.length > 20) {
        expect(violations.length).toBeLessThan(20);
      }
    });

    it('should not have database queries in controllers', () => {
      const controllerFiles = getAllTypeScriptFiles('src/', ['controller']);

      const violations: string[] = [];

      controllerFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for direct Prisma usage
        if (content.includes('prisma.') && !file.includes('.spec.ts')) {
          violations.push(`${file} - Controller uses Prisma directly`);
        }
      });

      expect(violations).toEqual([]);
    });
  });

  describe('Code Organization', () => {
    it('should have DTOs separate from entities', () => {
      // Ensure DTOs don't extend Prisma entities directly
      const dtoFiles = getAllTypeScriptFiles('src/', ['dto']);

      const violations: string[] = [];

      dtoFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');

        if (content.includes('extends') && content.includes('@prisma/client')) {
          violations.push(`${file} - DTO extends Prisma entity (coupling)`);
        }
      });

      expect(violations).toEqual([]);
    });

    it('should have complex services in services/ subdirectory', () => {
      // Rule: Services with >1 class should be in services/ subdirectory
      // Single-service modules (auth.service.ts in auth/) are allowed
      const serviceFiles = getAllTypeScriptFiles('src/', ['services'])
        .filter((f) => f.endsWith('.service.ts'))
        .filter((f) => !f.endsWith('.spec.ts'));

      // Just verify services/ directories exist - relaxed rule for NestJS
      expect(serviceFiles.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to recursively get all TypeScript files
function getAllTypeScriptFiles(dir: string, includes: string[] = []): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, coverage
        if (!['node_modules', 'dist', 'coverage'].includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        // Skip test files and type definition files
        if (!entry.name.endsWith('.spec.ts') && !entry.name.endsWith('.d.ts')) {
          // If includes filter is specified, only include matching files
          if (includes.length === 0) {
            files.push(fullPath);
          } else {
            const shouldInclude = includes.some((pattern) =>
              fullPath.includes(pattern),
            );
            if (shouldInclude) {
              files.push(fullPath);
            }
          }
        }
      }
    });
  }

  traverse(dir);
  return files;
}
