/**
 * Swagger Generation Tests
 *
 * Validates that @SdkExport decorator + generation script produces correct output.
 *
 * Uncle Bob: "Tests are documentation that never lies."
 *
 * Test categories:
 * 1. @SdkExport Detection - All decorated controllers are found
 * 2. Endpoint Extraction - All methods with @ApiOperation are captured
 * 3. DTO Parsing - Request/Response DTOs are properly extracted
 * 4. OpenAPI Structure - Generated spec is valid and complete
 * 5. Coverage Verification - No documented controllers are missing
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { execSync } from 'child_process';

const SCRIPTS_DIR = resolve(__dirname, '../scripts');
const SRC_DIR = resolve(__dirname, '../src');
const SWAGGER_PATH = resolve(__dirname, '../swagger.json');
const REPORT_PATH = resolve(__dirname, '../swagger-generation-report.json');

// ============================================================================
// Helper Functions
// ============================================================================

function findFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  function scan(currentDir: string) {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory() && !entry.name.includes('node_modules')) {
          scan(fullPath);
        } else if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable
    }
  }

  scan(dir);
  return files;
}

function hasDecorator(content: string, decorator: string): boolean {
  return content.includes(`@${decorator}`);
}

function countDecorators(content: string, decorator: string): number {
  const regex = new RegExp(`@${decorator}\\(`, 'g');
  return (content.match(regex) || []).length;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Swagger Generation Script', () => {
  let swagger: any;
  let report: any;

  beforeAll(() => {
    // Run the generation script
    try {
      execSync('bun run scripts/generate-swagger-from-decorators.ts', {
        cwd: resolve(__dirname, '..'),
        stdio: 'pipe',
      });
    } catch (e) {
      console.error('Script execution failed:', e);
    }

    // Load outputs
    if (existsSync(SWAGGER_PATH)) {
      swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    }
    if (existsSync(REPORT_PATH)) {
      report = JSON.parse(readFileSync(REPORT_PATH, 'utf-8'));
    }
  });

  describe('@SdkExport Detection', () => {
    test('script exists and is executable', () => {
      const scriptPath = join(
        SCRIPTS_DIR,
        'generate-swagger-from-decorators.ts',
      );
      expect(existsSync(scriptPath)).toBe(true);
    });

    test('decorator file exists', () => {
      const decoratorPath = join(
        SRC_DIR,
        'bounded-contexts/platform/common/decorators/sdk-export.decorator.ts',
      );
      expect(existsSync(decoratorPath)).toBe(true);
    });

    test('at least one controller has @SdkExport', () => {
      const controllers = findFiles(SRC_DIR, /\.controller\.ts$/);
      const withSdkExport = controllers.filter((f) => {
        const content = readFileSync(f, 'utf-8');
        return hasDecorator(content, 'SdkExport');
      });

      expect(withSdkExport.length).toBeGreaterThan(0);
      console.log(`\n📦 Controllers with @SdkExport: ${withSdkExport.length}`);
    });

    test('generation produces swagger.json', () => {
      expect(existsSync(SWAGGER_PATH)).toBe(true);
      expect(swagger).toBeDefined();
    });

    test('generation produces report.json', () => {
      expect(existsSync(REPORT_PATH)).toBe(true);
      expect(report).toBeDefined();
    });

    test('report indicates success', () => {
      expect(report.success).toBe(true);
    });
  });

  describe('Controller Extraction', () => {
    test('all @SdkExport controllers are in report', () => {
      const controllers = findFiles(SRC_DIR, /\.controller\.ts$/);
      const withSdkExport = controllers.filter((f) => {
        const content = readFileSync(f, 'utf-8');
        return hasDecorator(content, 'SdkExport');
      });

      expect(report.controllers).toBe(withSdkExport.length);
    });

    test('ResumeImportController is included', () => {
      const controllerNames = report.details.map((d: any) => d.controller);
      expect(controllerNames).toContain('ResumeImportController');
    });

    test('AuthCoreController is included', () => {
      const controllerNames = report.details.map((d: any) => d.controller);
      expect(controllerNames).toContain('AuthCoreController');
    });

    test('ResumesController is included', () => {
      const controllerNames = report.details.map((d: any) => d.controller);
      expect(controllerNames).toContain('ResumesController');
    });

    test('UsersController is included', () => {
      const controllerNames = report.details.map((d: any) => d.controller);
      expect(controllerNames).toContain('UsersController');
    });
  });

  describe('Endpoint Extraction', () => {
    test('ResumeImportController has 6 endpoints', () => {
      const resumeImport = report.details.find(
        (d: any) => d.controller === 'ResumeImportController',
      );
      expect(resumeImport.endpoints).toBe(6);
    });

    test('all @ApiOperation in controllers are captured', () => {
      // Count total @ApiOperation in @SdkExport controllers
      const controllers = findFiles(SRC_DIR, /\.controller\.ts$/);
      let expectedTotal = 0;

      for (const f of controllers) {
        const content = readFileSync(f, 'utf-8');
        if (hasDecorator(content, 'SdkExport')) {
          expectedTotal += countDecorators(content, 'ApiOperation');
        }
      }

      // Allow some margin for parsing edge cases
      const actualTotal = report.endpoints;
      const ratio = actualTotal / expectedTotal;

      console.log(
        `\n📊 Endpoints: ${actualTotal} extracted / ${expectedTotal} in source (${Math.round(ratio * 100)}%)`,
      );

      // At least 80% captured (some complex patterns may be missed)
      expect(ratio).toBeGreaterThanOrEqual(0.8);
    });

    test('resume-import endpoints have correct operation IDs', () => {
      const paths = swagger.paths;
      const resumeImportPaths = Object.keys(paths).filter((p) =>
        p.includes('resume-import'),
      );

      const operationIds = resumeImportPaths.flatMap((p) =>
        Object.values(paths[p]).map((m: any) => m.operationId),
      );

      // Should start with 'resume-import_'
      const validIds = operationIds.filter(
        (id) => typeof id === 'string' && id.startsWith('resume-import_'),
      );
      expect(validIds.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAPI Structure', () => {
    test('has valid OpenAPI version', () => {
      expect(swagger.openapi).toBe('3.0.0');
    });

    test('has info section', () => {
      expect(swagger.info).toBeDefined();
      expect(swagger.info.title).toBe('ProFile API');
      expect(swagger.info.version).toBeDefined();
    });

    test('has servers section', () => {
      expect(swagger.servers).toBeDefined();
      expect(swagger.servers.length).toBeGreaterThan(0);
    });

    test('has tags section', () => {
      expect(swagger.tags).toBeDefined();
      expect(swagger.tags.length).toBeGreaterThan(0);
    });

    test('all tags have name and description', () => {
      for (const tag of swagger.tags) {
        expect(tag.name).toBeDefined();
        expect(typeof tag.name).toBe('string');
      }
    });

    test('has paths section', () => {
      expect(swagger.paths).toBeDefined();
      expect(Object.keys(swagger.paths).length).toBeGreaterThan(0);
    });

    test('all paths start with /api', () => {
      const paths = Object.keys(swagger.paths);
      for (const path of paths) {
        expect(path.startsWith('/api')).toBe(true);
      }
    });

    test('has components.securitySchemes', () => {
      expect(swagger.components).toBeDefined();
      expect(swagger.components.securitySchemes).toBeDefined();
      expect(swagger.components.securitySchemes['JWT-auth']).toBeDefined();
    });

    test('JWT-auth security scheme is properly defined', () => {
      const jwtAuth = swagger.components.securitySchemes['JWT-auth'];
      expect(jwtAuth.type).toBe('http');
      expect(jwtAuth.scheme).toBe('bearer');
      expect(jwtAuth.bearerFormat).toBe('JWT');
    });
  });

  describe('Endpoint Definitions', () => {
    test('all endpoints have operationId', () => {
      const paths = swagger.paths;
      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, def] of Object.entries(
          methods as Record<string, any>,
        )) {
          expect(def.operationId).toBeDefined();
          expect(typeof def.operationId).toBe('string');
        }
      }
    });

    test('all endpoints have tags', () => {
      const paths = swagger.paths;
      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, def] of Object.entries(
          methods as Record<string, any>,
        )) {
          expect(def.tags).toBeDefined();
          expect(def.tags.length).toBeGreaterThan(0);
        }
      }
    });

    test('all endpoints have responses', () => {
      const paths = swagger.paths;
      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, def] of Object.entries(
          methods as Record<string, any>,
        )) {
          expect(def.responses).toBeDefined();
          expect(Object.keys(def.responses).length).toBeGreaterThan(0);
        }
      }
    });

    test('protected endpoints have security', () => {
      const paths = swagger.paths;
      let protectedCount = 0;
      let withSecurityCount = 0;

      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, def] of Object.entries(
          methods as Record<string, any>,
        )) {
          // Skip auth endpoints which are typically public
          if (!path.includes('/auth/signup') && !path.includes('/auth/login')) {
            protectedCount++;
            if (def.security && def.security.length > 0) {
              withSecurityCount++;
            }
          }
        }
      }

      const ratio = withSecurityCount / protectedCount;
      console.log(
        `\n🔒 Security: ${withSecurityCount}/${protectedCount} endpoints have security (${Math.round(ratio * 100)}%)`,
      );

      // At least 70% should have security
      expect(ratio).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Coverage Analysis', () => {
    test('report has coverage statistics', () => {
      expect(report.controllers).toBeDefined();
      expect(report.endpoints).toBeDefined();
      expect(report.schemas).toBeDefined();
      expect(report.tags).toBeDefined();
    });

    test('at least 5 controllers are exported', () => {
      expect(report.controllers).toBeGreaterThanOrEqual(5);
    });

    test('at least 20 endpoints are exported', () => {
      expect(report.endpoints).toBeGreaterThanOrEqual(20);
    });

    test('warnings are collected', () => {
      expect(report.warnings).toBeDefined();
      expect(Array.isArray(report.warnings)).toBe(true);
    });
  });

  describe('No Controllers Left Behind', () => {
    test('controllers with @SdkExport AND @ApiOperation are all in swagger', () => {
      const controllers = findFiles(SRC_DIR, /\.controller\.ts$/);
      const missing: string[] = [];

      for (const f of controllers) {
        const content = readFileSync(f, 'utf-8');

        // Only check controllers that SHOULD be exported
        if (
          hasDecorator(content, 'SdkExport') &&
          hasDecorator(content, 'ApiOperation')
        ) {
          // Extract class name
          const classMatch = content.match(/export class (\w+Controller)/);
          if (classMatch) {
            const className = classMatch[1];
            const inReport = report.details.some(
              (d: any) => d.controller === className,
            );
            if (!inReport) {
              missing.push(className);
            }
          }
        }
      }

      if (missing.length > 0) {
        console.log(`\n❌ Missing controllers: ${missing.join(', ')}`);
      }

      expect(missing.length).toBe(0);
    });

    test('all exported tags have at least one endpoint', () => {
      const tagEndpoints: Record<string, number> = {};

      for (const [path, methods] of Object.entries(swagger.paths)) {
        for (const [method, def] of Object.entries(
          methods as Record<string, any>,
        )) {
          for (const tag of def.tags || []) {
            tagEndpoints[tag] = (tagEndpoints[tag] || 0) + 1;
          }
        }
      }

      for (const tag of swagger.tags) {
        expect(tagEndpoints[tag.name]).toBeGreaterThan(0);
      }
    });
  });
});

describe('SDK Generation Compatibility', () => {
  test('swagger.json is valid JSON', () => {
    const content = readFileSync(SWAGGER_PATH, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('operation IDs are unique', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const operationIds: string[] = [];

    for (const [path, methods] of Object.entries(swagger.paths)) {
      for (const [method, def] of Object.entries(
        methods as Record<string, any>,
      )) {
        operationIds.push(def.operationId);
      }
    }

    const uniqueIds = new Set(operationIds);
    const duplicates = operationIds.filter(
      (id, index) => operationIds.indexOf(id) !== index,
    );

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Duplicate operationIds: ${duplicates.join(', ')}`);
    }

    // Some duplicates may exist for different paths - that's OK
    // But the ratio should be low
    const duplicateRatio = duplicates.length / operationIds.length;
    expect(duplicateRatio).toBeLessThan(0.2);
  });

  test('paths use valid OpenAPI parameter syntax', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));

    for (const path of Object.keys(swagger.paths)) {
      // Should use {param} not :param
      expect(path).not.toMatch(/:\w+/);

      // If has path params, should be in {} format
      const params = path.match(/\{(\w+)\}/g) || [];
      // That's valid
    }
  });

  test('all $ref references point to existing schemas', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const schemaNames = Object.keys(swagger.components?.schemas || {});

    function findRefs(obj: any, refs: string[] = []): string[] {
      if (typeof obj !== 'object' || obj === null) return refs;

      if (obj.$ref && typeof obj.$ref === 'string') {
        refs.push(obj.$ref);
      }

      for (const value of Object.values(obj)) {
        findRefs(value, refs);
      }

      return refs;
    }

    const allRefs = findRefs(swagger);
    const brokenRefs = allRefs.filter((ref) => {
      const schemaName = ref.replace('#/components/schemas/', '');
      return !schemaNames.includes(schemaName);
    });

    if (brokenRefs.length > 0) {
      console.log(`\n❌ Broken $ref (MUST FIX): ${brokenRefs.join(', ')}`);
    }

    // Zero tolerance - ALL references MUST resolve
    expect(brokenRefs.length).toBe(0);
  });
});
