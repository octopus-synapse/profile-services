#!/usr/bin/env bun
/**
 * Swagger Coverage Validator
 *
 * Enforces mandatory Swagger documentation for all API routes.
 * Fails the build if any route is missing required documentation.
 *
 * Required decorators:
 * - @ApiOperation() - Describes the endpoint purpose
 * - @ApiResponse() - At least one response status
 *
 * Usage:
 *   bun run src/scripts/validate-swagger-coverage.ts
 *
 * Exit codes:
 *   0 - All routes documented
 *   1 - Missing documentation found
 */

import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

interface RouteValidation {
  controller: string;
  file: string;
  method: string;
  httpMethod: string;
  line: number;
  missing: string[];
}

interface ValidationResult {
  totalControllers: number;
  totalRoutes: number;
  undocumentedRoutes: RouteValidation[];
  success: boolean;
}

const HTTP_DECORATORS = ['@Get(', '@Post(', '@Put(', '@Patch(', '@Delete('];
const REQUIRED_SWAGGER_DECORATORS = {
  operation: ['@ApiOperation('],
  response: ['@ApiResponse(', '@SwaggerResponse('], // Support both @ApiResponse and alias @SwaggerResponse
};

/**
 * Main validation function
 */
async function validateSwaggerCoverage(): Promise<ValidationResult> {
  console.log('🔍 Scanning controllers for Swagger documentation...\n');

  const controllersPattern = path.join(process.cwd(), 'src/**/*.controller.ts');
  const controllerFiles = await glob(controllersPattern, {
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  console.log(`📂 Found ${controllerFiles.length} controller files\n`);

  const undocumentedRoutes: RouteValidation[] = [];
  let totalRoutes = 0;

  for (const file of controllerFiles) {
    const violations = await validateController(file);
    undocumentedRoutes.push(...violations);
    totalRoutes += countRoutesInFile(file);
  }

  return {
    totalControllers: controllerFiles.length,
    totalRoutes,
    undocumentedRoutes,
    success: undocumentedRoutes.length === 0,
  };
}

/**
 * Validate a single controller file
 */
async function validateController(
  filePath: string,
): Promise<RouteValidation[]> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: RouteValidation[] = [];

  const controllerName = extractControllerName(filePath);

  // Check if controller is excluded from Swagger documentation
  if (content.includes('@ApiExcludeController()')) {
    return violations; // Skip validation for excluded controllers
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line contains an HTTP decorator
    const httpDecorator = HTTP_DECORATORS.find((dec) => line.startsWith(dec));
    if (!httpDecorator) continue;

    // Check if this specific route is excluded
    if (isRouteExcluded(lines, i)) {
      continue; // Skip this route
    }

    // Found a route, now check for required Swagger decorators
    const routeInfo = extractRouteInfo(lines, i);
    const missingDecorators = findMissingDecorators(lines, i);

    if (missingDecorators.length > 0) {
      violations.push({
        controller: controllerName,
        file: path.relative(process.cwd(), filePath),
        method: routeInfo.methodName,
        httpMethod: routeInfo.httpMethod,
        line: i + 1,
        missing: missingDecorators,
      });
    }
  }

  return violations;
}

/**
 * Check if a specific route is excluded from Swagger
 */
function isRouteExcluded(lines: string[], routeLineIndex: number): boolean {
  // Check decorators above the route
  const checkRangeStart = Math.max(0, routeLineIndex - 10);
  const decoratorsAbove = lines
    .slice(checkRangeStart, routeLineIndex)
    .map((line) => line.trim())
    .join('\n');

  return decoratorsAbove.includes('@ApiExcludeEndpoint()');
}

/**
 * Extract controller name from file path
 */
function extractControllerName(filePath: string): string {
  const fileName = path.basename(filePath, '.ts');
  return fileName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Extract route information (method name, HTTP verb)
 */
function extractRouteInfo(
  lines: string[],
  routeLineIndex: number,
): { methodName: string; httpMethod: string } {
  const routeLine = lines[routeLineIndex].trim();

  // Extract HTTP method from decorator
  const httpMethod =
    HTTP_DECORATORS.find((dec) => routeLine.startsWith(dec))
      ?.replace('@', '')
      .replace('(', '') ?? 'UNKNOWN';

  // Find the method declaration (should be a few lines after the decorator)
  // Skip decorator lines (lines starting with @)
  // Increased search range to 30 lines to handle routes with many decorators
  let methodName = 'unknown';
  for (
    let i = routeLineIndex + 1;
    i < Math.min(routeLineIndex + 30, lines.length);
    i++
  ) {
    const line = lines[i].trim();
    // Skip decorators
    if (line.startsWith('@')) continue;
    // Match async methodName( or methodName( but NOT starting with @
    const match = line.match(/^(?:async\s+)?(\w+)\s*\(/);
    if (match) {
      methodName = match[1];
      break;
    }
  }

  return { methodName, httpMethod };
}

/**
 * Find missing required Swagger decorators for a route
 */
function findMissingDecorators(
  lines: string[],
  routeLineIndex: number,
): string[] {
  // Check decorators above AND after the HTTP route decorator
  // Some decorators may appear after @Get(), @Post(), etc.
  const checkRangeStart = Math.max(0, routeLineIndex - 20);

  // Find where the method declaration starts (skip decorator lines)
  // Increased search range to 30 lines to handle routes with many decorators
  let methodLineIndex = routeLineIndex + 30;
  for (
    let i = routeLineIndex + 1;
    i < Math.min(routeLineIndex + 30, lines.length);
    i++
  ) {
    const line = lines[i].trim();
    // Skip decorators
    if (line.startsWith('@')) continue;
    // Check if line contains method declaration (but not a decorator)
    if (line.match(/^(?:async\s+)?(\w+)\s*\(/)) {
      methodLineIndex = i;
      break;
    }
  }

  const checkRangeEnd = methodLineIndex;

  const decoratorsInRange = lines
    .slice(checkRangeStart, checkRangeEnd)
    .map((line) => line.trim())
    .join('\n');

  const missing: string[] = [];

  // Check for @ApiOperation()
  const hasOperation = REQUIRED_SWAGGER_DECORATORS.operation.some((decorator) =>
    decoratorsInRange.includes(decorator),
  );
  if (!hasOperation) {
    missing.push('@ApiOperation');
  }

  // Check for @ApiResponse() or @SwaggerResponse()
  const hasResponse = REQUIRED_SWAGGER_DECORATORS.response.some((decorator) =>
    decoratorsInRange.includes(decorator),
  );
  if (!hasResponse) {
    missing.push('@ApiResponse');
  }

  return missing;
}

/**
 * Count total routes in a file
 */
function countRoutesInFile(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf-8');
  let count = 0;

  for (const decorator of HTTP_DECORATORS) {
    const regex = new RegExp(`${decorator.replace('(', '\\(')}`, 'g');
    const matches = content.match(regex);
    count += matches ? matches.length : 0;
  }

  return count;
}

/**
 * Print validation results
 */
function printResults(result: ValidationResult): void {
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );
  console.log('              SWAGGER DOCUMENTATION VALIDATION');
  console.log(
    '═══════════════════════════════════════════════════════════════\n',
  );

  console.log(`📊 Statistics:`);
  console.log(`   Controllers scanned: ${result.totalControllers}`);
  console.log(`   Total routes: ${result.totalRoutes}`);
  console.log(`   Undocumented routes: ${result.undocumentedRoutes.length}\n`);

  if (result.success) {
    console.log(
      '✅ SUCCESS: All routes have required Swagger documentation!\n',
    );
    console.log(
      '═══════════════════════════════════════════════════════════════\n',
    );
    return;
  }

  console.log(
    '❌ FAILURE: Found routes without required Swagger documentation\n',
  );
  console.log('Required decorators for each route:');
  console.log('  • @ApiOperation() - Describes the endpoint');
  console.log('  • @ApiResponse()  - Defines at least one response\n');
  console.log('Example:');
  console.log('  @Get()');
  console.log("  @ApiOperation({ summary: 'List all resources' })");
  console.log('  @ApiResponse({ status: 200, type: [ResourceDto] })');
  console.log('  async findAll() { ... }\n');

  console.log('📋 Undocumented Routes:\n');

  // Group by controller for better readability
  const byController = new Map<string, RouteValidation[]>();
  for (const violation of result.undocumentedRoutes) {
    const existing = byController.get(violation.controller) ?? [];
    existing.push(violation);
    byController.set(violation.controller, existing);
  }

  for (const [controller, violations] of byController.entries()) {
    console.log(`\n📁 ${controller}`);
    console.log(`   File: ${violations[0].file}\n`);

    for (const violation of violations) {
      console.log(
        `   ⚠️  ${violation.httpMethod.toUpperCase()} ${violation.method}() - Line ${violation.line}`,
      );
      console.log(`      Missing: ${violation.missing.join(', ')}`);
    }
  }

  console.log(
    '\n═══════════════════════════════════════════════════════════════',
  );
  console.log('❌ Build failed due to missing Swagger documentation');
  console.log(
    '═══════════════════════════════════════════════════════════════\n',
  );
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await validateSwaggerCoverage();
    printResults(result);

    // Exit with error code if validation failed
    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

// Execute when run directly
void main();

export { validateSwaggerCoverage };
export type { ValidationResult };
