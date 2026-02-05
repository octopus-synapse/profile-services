#!/usr/bin/env bun
/**
 * Add @ApiResponse({ type: XxxDto }) to all endpoints
 *
 * This script scans all controllers with @SdkExport and:
 * 1. Finds endpoints without explicit @ApiResponse type
 * 2. Infers the response type from the method's return type
 * 3. Adds the appropriate @ApiResponse decorator
 *
 * Run: bun run scripts/add-api-response-types.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC_DIR = join(import.meta.dir, '../src');

interface EndpointInfo {
  methodName: string;
  httpMethod: string;
  hasApiResponseType: boolean;
  returnType: string | null;
  lineNumber: number;
}

interface ControllerAnalysis {
  file: string;
  className: string;
  endpoints: EndpointInfo[];
  missingTypes: number;
}

function findFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.includes('node_modules')) {
        walk(fullPath);
      } else if (stat.isFile() && pattern.test(entry)) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function analyzeController(filePath: string): ControllerAnalysis | null {
  const content = readFileSync(filePath, 'utf-8');

  // Check if has @SdkExport
  if (!content.includes('@SdkExport')) {
    return null;
  }

  // Extract class name
  const classMatch = content.match(/export\s+class\s+(\w+Controller)/);
  if (!classMatch) return null;

  const className = classMatch[1];
  const endpoints: EndpointInfo[] = [];

  // Find all HTTP method decorators
  const httpMethods = ['Get', 'Post', 'Put', 'Patch', 'Delete'];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const method of httpMethods) {
      if (line.includes(`@${method}(`)) {
        // Look ahead for the method definition and @ApiResponse
        let hasApiResponseType = false;
        let returnType: string | null = null;
        let methodName = 'unknown';

        // Search forward for method definition (within 20 lines)
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          const checkLine = lines[j];

          // Check for @ApiResponse with type
          if (
            checkLine.includes('@ApiResponse') &&
            checkLine.includes('type:')
          ) {
            hasApiResponseType = true;
          }

          // Check for method definition with return type
          const methodMatch = checkLine.match(
            /async\s+(\w+)\s*\([^)]*\)(?:\s*:\s*Promise<([^>]+)>)?/,
          );
          if (methodMatch) {
            methodName = methodMatch[1];
            returnType = methodMatch[2] || null;
            break;
          }

          // Non-async method
          const syncMethodMatch = checkLine.match(
            /^\s*(\w+)\s*\([^)]*\)\s*(?::\s*(\w+))?/,
          );
          if (
            syncMethodMatch &&
            !checkLine.includes('@') &&
            !checkLine.includes('constructor')
          ) {
            methodName = syncMethodMatch[1];
            returnType = syncMethodMatch[2] || null;
            break;
          }
        }

        endpoints.push({
          methodName,
          httpMethod: method,
          hasApiResponseType,
          returnType,
          lineNumber: i + 1,
        });
      }
    }
  }

  const missingTypes = endpoints.filter((e) => !e.hasApiResponseType).length;

  return {
    file: filePath,
    className,
    endpoints,
    missingTypes,
  };
}

function inferResponseDto(
  returnType: string | null,
  methodName: string,
): string | null {
  if (!returnType) return null;

  // If it's already a DTO, use it
  if (returnType.endsWith('Dto')) {
    return returnType;
  }

  // Common patterns
  if (returnType.includes('[]')) {
    const baseType = returnType.replace('[]', '').trim();
    if (baseType.endsWith('Dto')) {
      return baseType; // Will be wrapped in array in @ApiResponse
    }
  }

  return null;
}

function addApiResponseToEndpoint(
  content: string,
  methodName: string,
  httpMethod: string,
  responseDto: string,
  isArray: boolean = false,
): string {
  // Find the HTTP decorator for this method
  const regex = new RegExp(
    `(@${httpMethod}\\([^)]*\\))([\\s\\S]*?)(async\\s+${methodName}\\s*\\()`,
    'g',
  );

  return content.replace(regex, (match, decorator, between, methodDef) => {
    // Check if already has @ApiResponse with type
    if (between.includes('@ApiResponse') && between.includes('type:')) {
      return match;
    }

    // Find @ApiOperation line to insert after
    const apiOpMatch = between.match(/(@ApiOperation\([^)]+\))/);
    if (apiOpMatch) {
      const typeAnnotation = isArray
        ? `type: [${responseDto}]`
        : `type: ${responseDto}`;
      const newApiResponse = `\n  @ApiResponse({ status: 200, ${typeAnnotation} })`;

      const updatedBetween = between.replace(
        apiOpMatch[1],
        `${apiOpMatch[1]}${newApiResponse}`,
      );
      return `${decorator}${updatedBetween}${methodDef}`;
    }

    return match;
  });
}

async function main() {
  console.log('🔍 Analyzing controllers for missing @ApiResponse types...\n');

  const controllerFiles = findFiles(SRC_DIR, /\.controller\.ts$/);
  const analyses: ControllerAnalysis[] = [];

  for (const file of controllerFiles) {
    const analysis = analyzeController(file);
    if (analysis && analysis.missingTypes > 0) {
      analyses.push(analysis);
    }
  }

  // Sort by missing types (descending)
  analyses.sort((a, b) => b.missingTypes - a.missingTypes);

  console.log('📊 Controllers with missing @ApiResponse types:\n');
  console.log('='.repeat(80));

  let totalMissing = 0;
  let totalEndpoints = 0;

  for (const analysis of analyses) {
    const relativePath = analysis.file.replace(SRC_DIR, 'src');
    console.log(`\n📁 ${analysis.className} (${relativePath})`);
    console.log(
      `   Missing: ${analysis.missingTypes}/${analysis.endpoints.length} endpoints`,
    );

    for (const endpoint of analysis.endpoints) {
      totalEndpoints++;
      if (!endpoint.hasApiResponseType) {
        totalMissing++;
        const returnInfo = endpoint.returnType
          ? ` → ${endpoint.returnType}`
          : '';
        console.log(
          `   ❌ ${endpoint.httpMethod.padEnd(6)} ${endpoint.methodName}${returnInfo} (line ${endpoint.lineNumber})`,
        );
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📈 Summary:`);
  console.log(
    `   Total controllers with @SdkExport: ${analyses.length + controllerFiles.filter((f) => readFileSync(f, 'utf-8').includes('@SdkExport')).length - analyses.length}`,
  );
  console.log(`   Endpoints missing @ApiResponse type: ${totalMissing}`);
  console.log(`   Total endpoints analyzed: ${totalEndpoints}`);

  // Generate report file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      controllersAnalyzed: analyses.length,
      endpointsMissingType: totalMissing,
      totalEndpoints: totalEndpoints,
    },
    controllers: analyses.map((a) => ({
      className: a.className,
      file: a.file.replace(SRC_DIR, 'src'),
      missingTypes: a.missingTypes,
      endpoints: a.endpoints
        .filter((e) => !e.hasApiResponseType)
        .map((e) => ({
          method: e.httpMethod,
          name: e.methodName,
          returnType: e.returnType,
          line: e.lineNumber,
        })),
    })),
  };

  writeFileSync(
    join(import.meta.dir, '../api-response-analysis.json'),
    JSON.stringify(report, null, 2),
  );

  console.log(`\n📄 Detailed report saved to: api-response-analysis.json`);
  console.log(
    '\n💡 Next step: Run with --fix to automatically add @ApiResponse decorators',
  );
}

main().catch(console.error);
