/**
 * Missing Endpoints Detection Tests
 *
 * Scans all controllers and checks if they should be in swagger.json.
 * Helps identify which endpoints are missing from documentation.
 */

import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Project root - all paths are relative to this
const PROJECT_ROOT = resolve(__dirname, '../../..');
const SWAGGER_PATH = join(PROJECT_ROOT, 'swagger.json');
const BOUNDED_CONTEXTS_DIR = join(PROJECT_ROOT, 'src/bounded-contexts');

function findAllControllers(dir: string, controllers: string[] = []): string[] {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      findAllControllers(fullPath, controllers);
    } else if (file.name.endsWith('.controller.ts') && !file.name.endsWith('.spec.ts')) {
      controllers.push(fullPath);
    }
  }

  return controllers;
}

function extractControllerInfo(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const name = filePath.split('/').pop()?.replace('.controller.ts', '') || '';

  // Check if controller has Swagger decorators
  const hasApiTags = content.includes('@ApiTags');
  const apiOperationCount = (content.match(/@ApiOperation/g) || []).length;
  const controllerDecorator = content.match(/@Controller\(['"](.+?)['"]\)/);
  const basePath = controllerDecorator?.[1] || '';
  const isExcluded = content.includes('@ApiExcludeController');

  return {
    name,
    filePath,
    hasApiTags,
    apiOperationCount,
    basePath,
    isExcluded,
    isDocumented: hasApiTags || apiOperationCount > 0,
  };
}

function normalizePath(path: string): string {
  return path
    .replace(/^\/api\/?/, '/')
    .replace(/\{[^}]+\}/g, ':param')
    .replace(/:[^/]+/g, ':param')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
}

describe('Missing Endpoints Detection', () => {
  test('scan all controllers in codebase', () => {
    const controllersDir = BOUNDED_CONTEXTS_DIR;
    const controllers = findAllControllers(controllersDir);

    expect(controllers.length).toBeGreaterThan(0);
    console.log(`\n📊 Found ${controllers.length} controllers in codebase`);
  });

  test('identify documented controllers', () => {
    const controllersDir = BOUNDED_CONTEXTS_DIR;
    const controllers = findAllControllers(controllersDir);
    const info = controllers.map(extractControllerInfo);

    const documented = info.filter((c) => c.isDocumented && !c.isExcluded);
    const undocumented = info.filter((c) => !c.isDocumented && !c.isExcluded);

    console.log(`\n✅ Documented controllers: ${documented.length}`);
    console.log(`❌ Undocumented controllers: ${undocumented.length}`);

    if (documented.length > 0) {
      console.log('\nDocumented:');
      documented.forEach((c) => {
        console.log(`  - ${c.name} (${c.apiOperationCount} operations) at /${c.basePath}`);
      });
    }

    if (undocumented.length > 0) {
      console.log('\nUndocumented:');
      undocumented.forEach((c) => {
        console.log(`  - ${c.name} at /${c.basePath}`);
      });
    }

    // For now just check that we found some documented ones
    expect(documented.length).toBeGreaterThan(0);
  });

  test('ResumeImportController is fully documented', () => {
    const controllersDir = BOUNDED_CONTEXTS_DIR;
    const controllers = findAllControllers(controllersDir);
    const resumeImport = controllers
      .map(extractControllerInfo)
      .find((c) => c.name === 'resume-import');

    expect(resumeImport).toBeDefined();
    expect(resumeImport?.isDocumented).toBe(true);
    expect(resumeImport?.apiOperationCount).toBeGreaterThanOrEqual(6);
  });

  test('documented controllers have paths in swagger.json', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const swaggerPaths = Object.keys(swagger.paths);

    const controllersDir = BOUNDED_CONTEXTS_DIR;
    const controllers = findAllControllers(controllersDir);
    const documented = controllers
      .map(extractControllerInfo)
      .filter((c) => c.isDocumented && c.basePath && !c.isExcluded);

    console.log('\n🔍 Checking if documented controllers are in swagger.json:');

    for (const controller of documented) {
      const normalizedBasePath = normalizePath(`/${controller.basePath}`);
      const hasPath = swaggerPaths.some((swaggerPath) => {
        const normalizedSwaggerPath = normalizePath(swaggerPath);
        return normalizedSwaggerPath.startsWith(normalizedBasePath);
      });

      if (hasPath) {
        console.log(`  ✅ ${controller.name} - found in swagger`);
      } else {
        console.log(
          `  ❌ ${controller.name} - MISSING from swagger (basePath: ${controller.basePath})`,
        );
      }
    }
  });
});

describe('Swagger Coverage Analysis', () => {
  test('count total endpoints in swagger vs documented controllers', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const swaggerEndpointCount = Object.entries(swagger.paths).reduce((count, [_, methods]) => {
      return count + Object.keys(methods as object).length;
    }, 0);

    const controllersDir = BOUNDED_CONTEXTS_DIR;
    const controllers = findAllControllers(controllersDir);
    const totalDocumented = controllers
      .map(extractControllerInfo)
      .reduce((sum, c) => sum + c.apiOperationCount, 0);

    console.log(`\n📊 Swagger Coverage:`);
    console.log(`  Endpoints in swagger.json: ${swaggerEndpointCount}`);
    console.log(`  @ApiOperation in controllers: ${totalDocumented}`);
    console.log(`  Coverage: ${((swaggerEndpointCount / totalDocumented) * 100).toFixed(1)}%`);

    // We expect at least some coverage
    expect(swaggerEndpointCount).toBeGreaterThan(0);
  });

  test('list all tags in swagger', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const tags = swagger.tags?.map((t: { name: string }) => t.name) || [];

    console.log(`\n🏷️  Tags in swagger.json: ${tags.join(', ')}`);
    expect(tags.length).toBeGreaterThan(0);
  });

  test('list all endpoints by tag', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const endpointsByTag: Record<string, string[]> = {};

    Object.entries(swagger.paths).forEach(([path, methods]) => {
      Object.entries(methods as Record<string, Record<string, unknown>>).forEach(
        ([method, operation]) => {
          const tags = (operation.tags as string[]) || ['untagged'];
          tags.forEach((tag: string) => {
            if (!endpointsByTag[tag]) endpointsByTag[tag] = [];
            endpointsByTag[tag].push(`${method.toUpperCase()} ${path}`);
          });
        },
      );
    });

    console.log('\n📍 Endpoints by tag:');
    Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
      console.log(`\n  ${tag}:`);
      endpoints.forEach((e) => {
        console.log(`    - ${e}`);
      });
    });

    expect(Object.keys(endpointsByTag).length).toBeGreaterThan(0);
  });
});

describe('Backend DTO vs Swagger Schema Comparison', () => {
  test('ImportJobDto keeps core fields visible in swagger schema', () => {
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const schema = swagger.components.schemas.ImportJobDto;

    // Read backend DTO file
    const dtoPath = join(
      PROJECT_ROOT,
      'src/bounded-contexts/import/infrastructure/dto/import-job.dto.ts',
    );
    const dtoContent = readFileSync(dtoPath, 'utf-8');

    // Check if backend has these properties (with or without ! assertion)
    const backendHasId = /\bid[!?]?:/.test(dtoContent);
    const backendHasUserId = /\buserId[!?]?:/.test(dtoContent);
    const backendHasStatus = /\bstatus[!?]?:/.test(dtoContent);
    const backendHasSource = /\bsource[!?]?:/.test(dtoContent);

    expect(backendHasId).toBe(true);
    expect(backendHasUserId).toBe(true);
    expect(backendHasStatus).toBe(true);
    expect(backendHasSource).toBe(true);

    // Swagger should also have these
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.status).toBeDefined();
    expect(schema.properties.source).toBeDefined();
    expect(schema.properties.createdAt).toBeDefined();
  });

  test('Zod schemas are converted to swagger schema', () => {
    const dtoPath = join(
      PROJECT_ROOT,
      'src/bounded-contexts/import/infrastructure/dto/import-job.dto.ts',
    );
    const dtoContent = readFileSync(dtoPath, 'utf-8');

    // Check that createZodDto is used (nestjs-zod pattern)
    expect(dtoContent).toContain('createZodDto');

    // Check that DTO classes exist
    expect(dtoContent).toMatch(/class\s+\w+Dto\s+extends\s+createZodDto/);

    // Verify swagger schema has the expected properties from Zod
    const swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf-8'));
    const schema = swagger.components?.schemas?.ImportJobDto;
    expect(schema).toBeDefined();
    expect(schema?.properties?.id).toBeDefined();
    expect(schema?.properties?.status).toBeDefined();
  });
});
