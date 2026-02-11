#!/usr/bin/env bun
/**
 * Swagger Generation from @SdkExport Decorators
 *
 * This script follows Uncle Bob's principles:
 * - Open/Closed: Adding new controllers doesn't require script changes
 * - Single Responsibility: Each function does one thing
 * - Dependency Inversion: Depends on decorator metadata, not concrete controllers
 *
 * How it works:
 * 1. Scans all *.controller.ts files
 * 2. Finds those with @SdkExport decorator
 * 3. Extracts HTTP methods, routes, DTOs from decorators
 * 4. Generates OpenAPI 3.0 spec automatically
 *
 * Usage:
 *   bun run scripts/generate-swagger-from-decorators.ts
 *
 * Pre-commit:
 *   This script MUST run before any other checks to ensure swagger.json is up-to-date.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// ============================================================================
// Types
// ============================================================================

interface SdkExportMetadata {
  tag: string;
  description?: string;
  version: string;
  requiresAuth: boolean;
}

interface EndpointInfo {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  operationId: string;
  summary: string;
  description?: string;
  requestBodyDto?: string;
  responseDto?: string;
  responseStatus: number;
  pathParams: Array<{ name: string; type: string }>;
  queryParams: Array<{ name: string; type: string; required: boolean }>;
}

interface ControllerInfo {
  filePath: string;
  className: string;
  basePath: string;
  sdkExport: SdkExportMetadata;
  endpoints: EndpointInfo[];
  dtoImports: string[];
}

interface DtoProperty {
  type: string;
  format?: string;
  nullable?: boolean;
  enum?: string[];
  example?: unknown;
  description?: string;
  items?: { type: string } | { $ref: string };
  $ref?: string;
}

interface DtoSchema {
  type: 'object';
  properties: Record<string, DtoProperty>;
  required?: string[];
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  srcDir: resolve(__dirname, '../src'),
  outputPath: resolve(__dirname, '../swagger.json'),
  apiPrefix: '/api',
  serverUrl: 'http://localhost:3001',
  title: 'ProFile API',
  description: 'ProFile Resume & Portfolio Management API',
  version: '1.0.0',
};

// ============================================================================
// File Scanner
// ============================================================================

function findFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  function scan(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory() && !entry.includes('node_modules') && !entry.startsWith('.')) {
          scan(fullPath);
        } else if (pattern.test(entry)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  scan(dir);
  return files;
}

// ============================================================================
// Controller Parser
// ============================================================================

function parseController(filePath: string): ControllerInfo | null {
  const content = readFileSync(filePath, 'utf-8');

  // Check for @SdkExport decorator
  const sdkExportMatch = content.match(/@SdkExport\(\s*\{([^}]+)\}\s*\)/s);
  if (!sdkExportMatch) {
    return null; // Controller not marked for SDK export
  }

  // Parse SdkExport options
  const optionsStr = sdkExportMatch[1];
  const sdkExport = parseSdkExportOptions(optionsStr);

  // Extract class name
  const classMatch = content.match(/export class (\w+Controller)/);
  if (!classMatch) return null;
  const className = classMatch[1];

  // Extract base path from @Controller
  const controllerMatch = content.match(/@Controller\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  // Convert :param to {param} for OpenAPI in base path
  const basePath = controllerMatch ? controllerMatch[1].replace(/:(\w+)/g, '{$1}') : '';

  // Extract endpoints
  const endpoints = parseEndpoints(content, sdkExport.tag);

  // Extract ALL DTOs used in this controller (automatic discovery)
  const dtoImports = extractAllDtosFromController(content);

  return {
    filePath,
    className,
    basePath,
    sdkExport,
    endpoints,
    dtoImports,
  };
}

function parseSdkExportOptions(optionsStr: string): SdkExportMetadata {
  const tagMatch = optionsStr.match(/tag:\s*['"`]([^'"`]+)['"`]/);
  const descMatch = optionsStr.match(/description:\s*['"`]([^'"`]+)['"`]/);
  const versionMatch = optionsStr.match(/version:\s*['"`]([^'"`]+)['"`]/);
  const authMatch = optionsStr.match(/requiresAuth:\s*(true|false)/);

  return {
    tag: tagMatch ? tagMatch[1] : 'default',
    description: descMatch ? descMatch[1] : undefined,
    version: versionMatch ? versionMatch[1] : 'v1',
    requiresAuth: authMatch ? authMatch[1] === 'true' : true,
  };
}

function parseEndpoints(content: string, tag: string): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];

  const methodPatterns = [
    { decorator: 'Get', method: 'get' as const, defaultStatus: 200 },
    { decorator: 'Post', method: 'post' as const, defaultStatus: 201 },
    { decorator: 'Put', method: 'put' as const, defaultStatus: 200 },
    { decorator: 'Patch', method: 'patch' as const, defaultStatus: 200 },
    { decorator: 'Delete', method: 'delete' as const, defaultStatus: 204 },
  ];

  for (const { decorator, method, defaultStatus } of methodPatterns) {
    // Find all occurrences of @Get/@Post/etc decorators
    const decoratorRegex = new RegExp(
      `@${decorator}\\(\\s*(?:['"\`]([^'"\`]*)['"\`])?\\s*\\)`,
      'g',
    );

    let decoratorMatch: RegExpExecArray | null = null;
    while ((decoratorMatch = decoratorRegex.exec(content)) !== null) {
      const decoratorEnd = decoratorMatch.index + decoratorMatch[0].length;
      const pathArg = decoratorMatch[1] || '';

      // Find the method that follows this decorator
      // Limit search to content before the next HTTP decorator to avoid mixing methods
      const remainingContent = content.substring(decoratorEnd);
      const nextDecoratorMatch = remainingContent.match(
        /@(?:Get|Post|Put|Patch|Delete|Head|Options)\s*\(/,
      );
      const searchLimit = nextDecoratorMatch?.index ?? Math.min(800, remainingContent.length);
      const afterDecorator = remainingContent.substring(0, searchLimit);

      // Extract @ApiOperation summary
      const apiOpMatch = afterDecorator.match(
        /@ApiOperation\(\s*\{[^}]*summary:\s*['"`]([^'"`]+)['"`]/s,
      );
      const summary = apiOpMatch ? apiOpMatch[1] : `${decorator} ${pathArg || 'endpoint'}`;

      // Extract @ApiOperation description
      const descMatch = afterDecorator.match(
        /@ApiOperation\(\s*\{[^}]*description:\s*['"`]([^'"`]+)['"`]/s,
      );
      const description = descMatch ? descMatch[1] : undefined;

      // Extract @ApiResponse status
      const statusMatch = afterDecorator.match(
        /@ApiResponse\(\s*\{[^}]*status:\s*(?:HttpStatus\.)?(\w+|\d+)/,
      );
      let responseStatus = defaultStatus;
      if (statusMatch) {
        const httpStatusMap: Record<string, number> = {
          OK: 200,
          CREATED: 201,
          ACCEPTED: 202,
          NO_CONTENT: 204,
          BAD_REQUEST: 400,
          UNAUTHORIZED: 401,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          CONFLICT: 409,
          INTERNAL_SERVER_ERROR: 500,
        };
        responseStatus =
          httpStatusMap[statusMatch[1]] || parseInt(statusMatch[1], 10) || defaultStatus;
      }

      // Extract @ApiResponse type (for response DTO)
      const responseTypeMatch = afterDecorator.match(/@ApiResponse\(\s*\{[^}]*type:\s*(\w+)/);
      const responseDto = responseTypeMatch ? responseTypeMatch[1] : undefined;

      // Extract method name for operationId
      // Look for "async methodName(" pattern - the actual function definition
      // Must skip decorators like @HttpCode, @ApiOperation etc.
      const methodMatch = afterDecorator.match(
        /\)\s*\{?\s*\n\s*(?:return\s+)?(?:async\s+)?(\w+)\s*\(/,
      );
      // Fallback: look for async functionName( after all decorators
      const fallbackMatch = afterDecorator.match(/async\s+([a-z][a-zA-Z0-9]*)\s*\(/);
      // Another fallback: look for any function followed by @CurrentUser or @Body or @Param
      const funcDefMatch = afterDecorator.match(/\n\s*async\s+([a-z][a-zA-Z0-9]*)\s*\(/);
      const methodName =
        funcDefMatch?.[1] || fallbackMatch?.[1] || methodMatch?.[1] || `${method}Endpoint`;

      // Extract @Body DTO
      const bodyMatch = afterDecorator.match(/@Body\([^)]*\)[^:]*:\s*(\w+Dto)/);
      const requestBodyDto = bodyMatch ? bodyMatch[1] : undefined;

      // Extract path params
      const pathParams: Array<{ name: string; type: string }> = [];
      const paramMatches = pathArg.matchAll(/:(\w+)/g);
      for (const pm of paramMatches) {
        pathParams.push({ name: pm[1], type: 'string' });
      }

      // Map TypeScript types to OpenAPI types
      const mapToOpenApiType = (tsType: string): string => {
        const typeMap: Record<string, string> = {
          string: 'string',
          number: 'number',
          integer: 'integer',
          boolean: 'boolean',
          // UUID and IDs are strings
          uuid: 'string',
          // Any custom types default to string
        };
        const normalized = tsType.toLowerCase();
        return typeMap[normalized] ?? 'string';
      };

      // Also check for @Param decorators
      const paramDecorators = afterDecorator.matchAll(
        /@Param\(['"`](\w+)['"`](?:[^)]*)\)\s*\w+:\s*(\w+)/g,
      );
      for (const pd of paramDecorators) {
        if (!pathParams.find((p) => p.name === pd[1])) {
          pathParams.push({ name: pd[1], type: mapToOpenApiType(pd[2]) });
        }
      }

      // Extract query params
      const queryParams: Array<{
        name: string;
        type: string;
        required: boolean;
      }> = [];
      const queryMatches = afterDecorator.matchAll(
        /@Query\(['"`](\w+)['"`](?:[^)]*)\)\s*(\w+)(\?)?:\s*(\w+)/g,
      );
      for (const qm of queryMatches) {
        queryParams.push({
          name: qm[1],
          type: mapToOpenApiType(qm[4]),
          required: qm[3] !== '?',
        });
      }

      // Convert :param to {param} for OpenAPI
      const openApiPath = pathArg.replace(/:(\w+)/g, '{$1}');

      // Generate operationId: tag_methodName
      const operationId = `${tag}_${methodName}`;

      endpoints.push({
        method,
        path: openApiPath,
        operationId,
        summary,
        description,
        requestBodyDto,
        responseDto,
        responseStatus,
        pathParams,
        queryParams,
      });
    }
  }

  return endpoints;
}

/**
 * Extract ALL DTOs used in a controller file
 * - From import statements
 * - From @Body() type annotations
 * - From @ApiResponse type annotations
 * - From @ApiBody type annotations
 * - From function return types
 */
function extractAllDtosFromController(content: string): string[] {
  const dtos = new Set<string>();

  // 1. From imports that include 'dto' in path
  const importMatches = content.matchAll(/import\s*\{([^}]+)\}[^;]*(?:\.dto|dto\/|\/dto)/g);
  for (const imp of importMatches) {
    const items = imp[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);
    const dtoItems = items.filter((s) => s.endsWith('Dto') || s.endsWith('DTO'));
    for (const dto of dtoItems) {
      dtos.add(dto);
    }
  }

  // 2. From @Body() annotations: @Body() dto: SomeDto
  const bodyMatches = content.matchAll(/@Body\([^)]*\)[^:]*:\s*(\w+Dto)/g);
  for (const match of bodyMatches) {
    dtos.add(match[1]);
  }

  // 3. From @ApiResponse type: @ApiResponse({ type: SomeDto })
  const apiResponseMatches = content.matchAll(/@ApiResponse\(\s*\{[^}]*type:\s*(\w+Dto)/g);
  for (const match of apiResponseMatches) {
    dtos.add(match[1]);
  }

  // 4. From @ApiBody type: @ApiBody({ type: SomeDto })
  const apiBodyMatches = content.matchAll(/@ApiBody\(\s*\{[^}]*type:\s*(\w+Dto)/g);
  for (const match of apiBodyMatches) {
    dtos.add(match[1]);
  }

  // 5. From function return types: ): Promise<SomeDto> or ): SomeDto
  const returnTypeMatches = content.matchAll(/\):\s*(?:Promise<)?(\w+Dto)>?\s*\{/g);
  for (const match of returnTypeMatches) {
    dtos.add(match[1]);
  }

  // 6. Any other reference to *Dto classes
  const allDtoRefs = content.matchAll(/\b(\w+Dto)\b/g);
  for (const match of allDtoRefs) {
    // Only add if it looks like a class name (starts with uppercase)
    if (/^[A-Z]/.test(match[1])) {
      dtos.add(match[1]);
    }
  }

  return [...dtos];
}

// ============================================================================
// DTO Parser
// ============================================================================

/**
 * Extract nested DTO references from a parsed schema
 * Finds $ref references to other DTOs in properties and array items
 */
function extractNestedDtoRefs(schema: DtoSchema): string[] {
  const refs: string[] = [];

  for (const prop of Object.values(schema.properties)) {
    // Direct $ref
    if ('$ref' in prop && prop.$ref) {
      const match = prop.$ref.match(/#\/components\/schemas\/(\w+)/);
      if (match) refs.push(match[1]);
    }
    // Array items with $ref
    if (prop.items && typeof prop.items === 'object' && '$ref' in prop.items && prop.items.$ref) {
      const match = prop.items.$ref.match(/#\/components\/schemas\/(\w+)/);
      if (match) refs.push(match[1]);
    }
  }

  return refs;
}

/**
 * Discover ALL DTOs in the backend codebase
 * Scans all .dto.ts files and extracts class names with @ApiProperty
 */
function _discoverAllDtos(srcDir: string): string[] {
  const dtoFiles = findFiles(srcDir, /\.dto\.ts$/);
  const allDtos = new Set<string>();

  for (const file of dtoFiles) {
    const content = readFileSync(file, 'utf-8');

    // Find all exported classes that end with Dto
    const classMatches = content.matchAll(/export\s+class\s+(\w+Dto)\s*(?:extends|implements|\{)/g);
    for (const match of classMatches) {
      allDtos.add(match[1]);
    }

    // Also find non-exported classes (inline DTOs)
    const inlineMatches = content.matchAll(/^class\s+(\w+Dto)\s*(?:extends|implements|\{)/gm);
    for (const match of inlineMatches) {
      allDtos.add(match[1]);
    }
  }

  console.log(`  📋 Discovered ${allDtos.size} DTO classes in codebase`);
  return [...allDtos];
}

function findAndParseDtos(srcDir: string, dtoNames: string[]): Record<string, DtoSchema> {
  const schemas: Record<string, DtoSchema> = {};

  // Search in both .dto.ts files AND .controller.ts files (for inline DTOs)
  // Sort for deterministic output across platforms
  const dtoFiles = findFiles(srcDir, /\.(dto|controller)\.ts$/).sort();

  // Keep track of DTOs to process (start with initial list, sorted for determinism)
  const toProcess = new Set(dtoNames.sort());
  const processed = new Set<string>();

  // Iteratively discover and parse DTOs until no new ones found
  while (toProcess.size > 0) {
    const currentBatch = [...toProcess].sort(); // Sort for deterministic order
    toProcess.clear();

    for (const dtoName of currentBatch) {
      if (processed.has(dtoName) || schemas[dtoName]) continue;
      processed.add(dtoName);

      for (const dtoFile of dtoFiles) {
        const content = readFileSync(dtoFile, 'utf-8');

        // Match both "export class" and just "class" (for inline DTOs)
        if (
          (content.includes(`export class ${dtoName}`) || content.includes(`class ${dtoName}`)) &&
          !schemas[dtoName]
        ) {
          const schema = parseDtoClass(content, dtoName);
          if (schema && Object.keys(schema.properties).length > 0) {
            schemas[dtoName] = schema;

            // Discover nested DTO references and add to processing queue
            const nestedRefs = extractNestedDtoRefs(schema);
            for (const ref of nestedRefs) {
              if (!processed.has(ref) && !schemas[ref]) {
                toProcess.add(ref);
              }
            }
          }
        }
      }
    }
  }

  return schemas;
}

function parseDtoClass(content: string, className: string): DtoSchema | null {
  // Find class definition - handle extends and implements, with or without export
  const classRegex = new RegExp(
    `(?:export\\s+)?class ${className}(?:\\s+extends\\s+\\w+)?(?:\\s+implements\\s+[\\w,\\s]+)?\\s*\\{`,
    's',
  );
  const classStart = content.search(classRegex);
  if (classStart === -1) return null;

  // Find the matching closing brace
  let braceCount = 0;
  let classEnd = classStart;
  let foundStart = false;

  for (let i = classStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      foundStart = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (foundStart && braceCount === 0) {
        classEnd = i;
        break;
      }
    }
  }

  const classBody = content.substring(classStart, classEnd + 1);
  const properties: Record<string, DtoProperty> = {};
  const required: string[] = [];

  // Parse properties with @ApiProperty (handles multiline and other decorators between)
  // Match @ApiProperty({ ... }) followed by optional decorators, then property definition
  const propRegex =
    /@ApiProperty\(\s*\{([\s\S]*?)\}\s*\)[\s\S]*?(?:@\w+\([^)]*\)\s*)*(?:readonly\s+)?(\w+)(\?)?!?:\s*([^;=\n]+)/g;

  let propMatch: RegExpExecArray | null = null;
  while ((propMatch = propRegex.exec(classBody)) !== null) {
    const apiPropOptions = propMatch[1];
    const propName = propMatch[2];
    const isOptional = propMatch[3] === '?';
    let propType = propMatch[4].trim();

    // Handle array types
    const isArray = propType.endsWith('[]') || propType.includes('Array<');
    if (isArray) {
      propType = propType.replace('[]', '').replace(/Array<(\w+)>/, '$1');
    }

    // Map TypeScript types to JSON Schema types
    const typeMap: Record<string, { type: string; format?: string }> = {
      string: { type: 'string' },
      number: { type: 'number' },
      boolean: { type: 'boolean' },
      Date: { type: 'string', format: 'date-time' },
      any: { type: 'object' },
      object: { type: 'object' },
    };

    const mappedType = typeMap[propType] || { type: 'string' };
    const property: DtoProperty = { ...mappedType };

    // Handle arrays
    if (isArray) {
      property.type = 'array';
      if (propType.endsWith('Dto')) {
        property.items = { $ref: `#/components/schemas/${propType}` };
      } else {
        property.items = { type: mappedType.type };
      }
    }

    // Handle DTO references
    if (!isArray && propType.endsWith('Dto')) {
      property.$ref = `#/components/schemas/${propType}`;
      property.type = undefined as unknown as string;
    }

    // Extract enum if present
    const enumMatch = apiPropOptions.match(/enum:\s*(\w+)/);
    if (enumMatch) {
      property.type = 'string';
      // Try to find enum values
      const enumName = enumMatch[1];
      const enumValuesMatch = content.match(new RegExp(`enum\\s+${enumName}\\s*\\{([^}]+)\\}`));
      if (enumValuesMatch) {
        const values = enumValuesMatch[1]
          .split(',')
          .map((v) => v.trim().split('=')[0].trim())
          .filter(Boolean);
        property.enum = values;
      }
    }

    // Extract example
    const exampleMatch = apiPropOptions.match(/example:\s*(['"`]?)([^'"`\s,}]+)\1/);
    if (exampleMatch) {
      property.example = exampleMatch[2];
    }

    // Extract description
    const descMatch = apiPropOptions.match(/description:\s*['"`]([^'"`]+)['"`]/);
    if (descMatch) {
      property.description = descMatch[1];
    }

    // Check nullable
    const nullableMatch = apiPropOptions.match(/nullable:\s*(true|false)/);
    if (nullableMatch && nullableMatch[1] === 'true') {
      property.nullable = true;
    }

    properties[propName] = property;

    if (!isOptional) {
      required.push(propName);
    }
  }

  // Also parse simple properties without @ApiProperty (for completeness)
  const simplePropRegex = /(?:readonly\s+)?(\w+)(\?)?:\s*(\w+)(?:\s*[;=])/g;
  let simpleMatch: RegExpExecArray | null = null;
  while ((simpleMatch = simplePropRegex.exec(classBody)) !== null) {
    const propName = simpleMatch[1];
    if (!properties[propName] && !propName.startsWith('_')) {
      const propType = simpleMatch[3];
      const isOptional = simpleMatch[2] === '?';

      const typeMap: Record<string, string> = {
        string: 'string',
        number: 'number',
        boolean: 'boolean',
        Date: 'string',
      };

      properties[propName] = {
        type: typeMap[propType] || 'string',
      };

      if (!isOptional) {
        required.push(propName);
      }
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? [...new Set(required)] : undefined,
  };
}

// ============================================================================
// OpenAPI Generator
// ============================================================================

function generateOpenApiSpec(
  controllers: ControllerInfo[],
  schemas: Record<string, DtoSchema>,
): object {
  const tags = new Map<string, string>();
  const paths: Record<string, Record<string, unknown>> = {};

  for (const controller of controllers) {
    // Register tag
    tags.set(controller.sdkExport.tag, controller.sdkExport.description || '');

    // Generate paths
    for (const endpoint of controller.endpoints) {
      // Build full path
      let fullPath = CONFIG.apiPrefix;
      if (controller.basePath) {
        fullPath += `/${controller.basePath}`;
      }
      if (endpoint.path) {
        fullPath += `/${endpoint.path}`;
      }
      // Normalize path
      fullPath = fullPath.replace(/\/+/g, '/').replace(/\/$/, '');
      if (!fullPath.startsWith('/')) fullPath = `/${fullPath}`;

      if (!paths[fullPath]) {
        paths[fullPath] = {};
      }

      const operation: Record<string, unknown> = {
        operationId: endpoint.operationId,
        tags: [controller.sdkExport.tag],
        summary: endpoint.summary,
      };

      if (endpoint.description) {
        operation.description = endpoint.description;
      }

      // Add security if required
      if (controller.sdkExport.requiresAuth) {
        operation.security = [{ 'JWT-auth': [] }];
      }

      // Add path parameters (deduplicated by name)
      const parameterMap = new Map<string, unknown>();
      for (const param of endpoint.pathParams) {
        const key = `path:${param.name}`;
        if (!parameterMap.has(key)) {
          parameterMap.set(key, {
            name: param.name,
            in: 'path',
            required: true,
            schema: { type: param.type },
          });
        }
      }

      // Add query parameters (deduplicated by name)
      for (const param of endpoint.queryParams) {
        const key = `query:${param.name}`;
        if (!parameterMap.has(key)) {
          parameterMap.set(key, {
            name: param.name,
            in: 'query',
            required: param.required,
            schema: { type: param.type },
          });
        }
      }

      const parameters = Array.from(parameterMap.values());
      if (parameters.length > 0) {
        operation.parameters = parameters;
      }

      // Add request body
      if (endpoint.requestBodyDto) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${endpoint.requestBodyDto}`,
              },
            },
          },
        };
      }

      // Add responses
      const responses: Record<string, unknown> = {
        [endpoint.responseStatus.toString()]: {
          description: endpoint.summary,
        },
      };

      if (endpoint.responseDto) {
        responses[endpoint.responseStatus.toString()] = {
          description: endpoint.summary,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${endpoint.responseDto}` },
            },
          },
        };
      }

      // Add common error responses for protected endpoints
      if (controller.sdkExport.requiresAuth) {
        responses['401'] = {
          description: 'Unauthorized - Authentication required',
        };
      }

      operation.responses = responses;

      paths[fullPath][endpoint.method] = operation;
    }
  }

  // Sort paths for deterministic output
  const sortedPaths: Record<string, Record<string, unknown>> = {};
  for (const pathKey of Object.keys(paths).sort()) {
    // Also sort methods within each path
    const methodsObj = paths[pathKey];
    const sortedMethods: Record<string, unknown> = {};
    for (const method of Object.keys(methodsObj).sort()) {
      sortedMethods[method] = methodsObj[method];
    }
    sortedPaths[pathKey] = sortedMethods;
  }

  // Sort schemas for deterministic output
  const sortedSchemas: Record<string, DtoSchema> = {};
  for (const schemaKey of Object.keys(schemas).sort()) {
    sortedSchemas[schemaKey] = schemas[schemaKey];
  }

  // Sort tags for deterministic output
  const sortedTags = Array.from(tags.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, description]) => ({
      name,
      description,
    }));

  return {
    openapi: '3.0.0',
    info: {
      title: CONFIG.title,
      description: CONFIG.description,
      version: CONFIG.version,
    },
    servers: [
      {
        url: CONFIG.serverUrl,
        description: 'Development Server',
      },
    ],
    tags: sortedTags,
    paths: sortedPaths,
    components: {
      securitySchemes: {
        'JWT-auth': {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: sortedSchemas,
    },
  };
}

// ============================================================================
// Report Generator
// ============================================================================

interface GenerationReport {
  success: boolean;
  timestamp: string;
  controllers: number;
  endpoints: number;
  schemas: number;
  tags: string[];
  details: Array<{
    controller: string;
    tag: string;
    endpoints: number;
    file: string;
  }>;
  warnings: string[];
}

function generateReport(
  controllers: ControllerInfo[],
  schemas: Record<string, DtoSchema>,
): GenerationReport {
  const warnings: string[] = [];

  // Check for endpoints without DTOs
  for (const controller of controllers) {
    for (const endpoint of controller.endpoints) {
      if (['post', 'put', 'patch'].includes(endpoint.method) && !endpoint.requestBodyDto) {
        warnings.push(
          `${controller.className}.${endpoint.operationId}: ${endpoint.method.toUpperCase()} endpoint without request body DTO`,
        );
      }
    }
  }

  // Check for referenced but missing DTOs
  const allReferencedDtos = new Set<string>();
  for (const controller of controllers) {
    for (const endpoint of controller.endpoints) {
      if (endpoint.requestBodyDto) allReferencedDtos.add(endpoint.requestBodyDto);
      if (endpoint.responseDto) allReferencedDtos.add(endpoint.responseDto);
    }
  }

  for (const dto of allReferencedDtos) {
    if (!schemas[dto]) {
      warnings.push(`DTO "${dto}" is referenced but not found in schemas`);
    }
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    controllers: controllers.length,
    endpoints: controllers.reduce((sum, c) => sum + c.endpoints.length, 0),
    schemas: Object.keys(schemas).length,
    tags: [...new Set(controllers.map((c) => c.sdkExport.tag))],
    details: controllers.map((c) => ({
      controller: c.className,
      tag: c.sdkExport.tag,
      endpoints: c.endpoints.length,
      file: relative(CONFIG.srcDir, c.filePath),
    })),
    warnings,
  };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log('🔍 Scanning controllers with @SdkExport...\n');

  // Find and parse controllers (sorted for deterministic output across platforms)
  const controllerFiles = findFiles(CONFIG.srcDir, /\.controller\.ts$/).sort();
  const controllers: ControllerInfo[] = [];
  const allDtos = new Set<string>();

  for (const file of controllerFiles) {
    const info = parseController(file);
    if (info) {
      controllers.push(info);
      for (const dto of info.dtoImports) {
        allDtos.add(dto);
      }
      console.log(
        `  ✅ ${info.className} (${info.endpoints.length} endpoints) [${info.sdkExport.tag}]`,
      );
    }
  }

  if (controllers.length === 0) {
    console.log('⚠️  No controllers with @SdkExport found.\n');
    console.log('   Add @SdkExport decorator to controllers you want in the SDK:');
    console.log('');
    console.log('   @SdkExport({ tag: "my-feature", description: "My Feature API" })');
    console.log('   @Controller("v1/my-feature")');
    console.log('   export class MyFeatureController {}');
    console.log('');
    process.exit(1);
  }

  console.log(`\n📦 Found ${controllers.length} controllers with @SdkExport`);

  // Collect all DTOs referenced in endpoints
  for (const controller of controllers) {
    for (const endpoint of controller.endpoints) {
      if (endpoint.requestBodyDto) allDtos.add(endpoint.requestBodyDto);
      if (endpoint.responseDto) allDtos.add(endpoint.responseDto);
    }
  }

  // Parse DTOs
  console.log('\n🔍 Parsing DTOs...');
  const schemas = findAndParseDtos(CONFIG.srcDir, Array.from(allDtos));
  console.log(`  📋 Found ${Object.keys(schemas).length} DTOs`);

  // Generate OpenAPI spec
  console.log('\n📝 Generating OpenAPI spec...');
  const spec = generateOpenApiSpec(controllers, schemas);

  // Write output
  writeFileSync(CONFIG.outputPath, JSON.stringify(spec, null, 2));

  // Generate and display report
  const report = generateReport(controllers, schemas);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Generation Report');
  console.log('='.repeat(60));
  console.log(`  Controllers: ${report.controllers}`);
  console.log(`  Endpoints:   ${report.endpoints}`);
  console.log(`  Schemas:     ${report.schemas}`);
  console.log(`  Tags:        ${report.tags.join(', ')}`);

  if (report.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warning of report.warnings) {
      console.log(`    - ${warning}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Swagger JSON generated: ${CONFIG.outputPath}`);
  console.log(`${'='.repeat(60)}\n`);

  // Write report for testing
  const reportPath = resolve(__dirname, '../swagger-generation-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

// Run if executed directly
const _report = main();
export { main, parseController, parseDtoClass, generateReport };
export type { ControllerInfo, EndpointInfo, GenerationReport };
