#!/usr/bin/env bun
/**
 * Generate `swagger.json` from the framework-free `Route` descriptors.
 *
 * Phase-2 cutover: the previous Nest-coupled implementation booted
 * `AppModule` and read `@nestjs/swagger` decorators. With Nest gone we
 * walk every `src/**​/*.routes.ts` file directly, build an OpenAPI 3.0
 * document by registering Zod schemas via
 * `@asteasolutions/zod-to-openapi`, and emit the JSON file the SDK
 * generator (`patch-careers-ui/packages/api-client`) consumes.
 *
 * Each `*.routes.ts` exports a `ReadonlyArray<Route<TBundle>>` that
 * carries `openapi: { summary, tags, description, extensions }` and
 * `sdk: { exported, name }`. Both are forwarded to the document.
 */

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { type AnyZodObject, type ZodSchema, z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import {
  EXAMPLE_CONVERSATION_ID,
  EXAMPLE_GENERIC_ID,
  EXAMPLE_JOB_ID,
  EXAMPLE_NOTIFICATION_ID,
  EXAMPLE_POST_ID,
  EXAMPLE_RESUME_ID,
  EXAMPLE_SLUG,
  EXAMPLE_USER_ID,
} from '@/shared-kernel/schemas/params/example-ids.const';

extendZodWithOpenApi(z);

const SRC_DIR = resolve(__dirname, '../src');
const SWAGGER_PATH = resolve(__dirname, '../swagger.json');
const CLIENT_SWAGGER_PATH = resolve(__dirname, '../client-swagger.json');
const REPORT_PATH = resolve(__dirname, '../swagger-generation-report.json');

interface SwaggerReport {
  readonly success: boolean;
  readonly generatedBy: 'route-descriptors';
  readonly paths: number;
  readonly operations: number;
  readonly schemas: number;
  readonly tags: string[];
}

function* walk(dir: string): Generator<string> {
  const entries = [...readdirSync(dir)].sort();
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '__tests__' || entry === 'testing') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (st.isFile() && entry.endsWith('.routes.ts') && !entry.endsWith('.spec.ts')) {
      yield full;
    }
  }
}

function isRouteArray(value: unknown): value is ReadonlyArray<Route> {
  if (!Array.isArray(value) || value.length === 0) return false;
  const first = value[0] as Partial<Route> | undefined;
  return (
    typeof first === 'object' &&
    first !== null &&
    typeof (first as Route).method === 'string' &&
    typeof (first as Route).path === 'string' &&
    typeof (first as Route).handler === 'function'
  );
}

async function loadRoutes(): Promise<Route[]> {
  const all: Route[] = [];
  for (const file of walk(SRC_DIR)) {
    try {
      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      for (const value of Object.values(mod)) {
        if (isRouteArray(value)) all.push(...(value as Route[]));
      }
    } catch (err) {
      console.warn(`Skipped ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // Stable, host-independent ordering. `readdirSync` order is filesystem-
  // defined (ext4 vs the runner's mount differ), so sort by the values
  // that actually shape the spec instead of trusting the walk order.
  all.sort((a, b) => {
    const pathCmp = a.path.localeCompare(b.path, 'en');
    if (pathCmp !== 0) return pathCmp;
    return a.method.localeCompare(b.method, 'en');
  });
  return all;
}

function isZodSchema(value: unknown): value is ZodSchema<unknown> {
  return typeof value === 'object' && value !== null && '_def' in value;
}

function getTypeName(schema: ZodSchema<unknown>): string | undefined {
  return (schema as unknown as { _def?: { typeName?: string } })._def?.typeName;
}

function unwrapToZodObject(schema: unknown): AnyZodObject | undefined {
  if (!isZodSchema(schema)) return undefined;
  let current: ZodSchema<unknown> = schema;
  for (let depth = 0; depth < 5; depth += 1) {
    const typeName = getTypeName(current);
    if (typeName === 'ZodObject') return current as unknown as AnyZodObject;
    if (typeName === 'ZodEffects') {
      const inner = (current as unknown as { _def: { schema: ZodSchema<unknown> } })._def.schema;
      current = inner;
      continue;
    }
    return undefined;
  }
  return undefined;
}

function buildPathParamsSchema(
  route: Route,
  pathParams: readonly string[],
): AnyZodObject | undefined {
  if (pathParams.length === 0) return undefined;
  const declared = unwrapToZodObject(route.params);
  // Re-key against the path tokens — some legacy routes declare
  // `params: ResumeIdParam` (keyed by `resumeId`) on a `/:id` path.
  // The URL template is the source of truth; trust it and reuse the
  // declared sub-schema only when the names line up.
  const declaredShape = declared
    ? (declared._def.shape() as Record<string, ZodSchema<unknown>>)
    : {};
  const shape: Record<string, ZodSchema<unknown>> = {};
  for (const name of pathParams) {
    shape[name] = declaredShape[name] ?? z.string();
  }
  return z.object(shape);
}

function buildSuccessStatus(route: Route): string {
  if (typeof route.statusCode === 'number') return String(route.statusCode);
  return route.method === 'POST' ? '201' : '200';
}

function fallbackExampleForParam(name: string): string {
  if (name === 'userId') return EXAMPLE_USER_ID;
  if (name === 'resumeId') return EXAMPLE_RESUME_ID;
  if (name === 'jobId') return EXAMPLE_JOB_ID;
  if (name === 'postId') return EXAMPLE_POST_ID;
  if (name === 'conversationId') return EXAMPLE_CONVERSATION_ID;
  if (name === 'notificationId') return EXAMPLE_NOTIFICATION_ID;
  if (name === 'id' || name.endsWith('Id')) return EXAMPLE_GENERIC_ID;
  if (name === 'q' || name === 'query' || name === 'search') return 'fixture';
  return EXAMPLE_SLUG;
}

interface OpenApiParameter {
  name?: string;
  in?: string;
  required?: boolean;
  example?: unknown;
  schema?: { example?: unknown };
}

interface OpenApiOperation {
  parameters?: OpenApiParameter[];
}

function injectFallbackExamples(document: {
  paths?: Record<string, Record<string, unknown>>;
}): void {
  for (const ops of Object.values(document.paths ?? {})) {
    for (const op of Object.values(ops)) {
      const operation = op as OpenApiOperation;
      for (const param of operation.parameters ?? []) {
        if (!param.name) continue;
        const isPath = param.in === 'path';
        const isRequiredQuery = param.in === 'query' && param.required === true;
        if (!isPath && !isRequiredQuery) continue;
        const schemaExample = param.schema?.example;
        const example =
          (param.example as string | undefined) ??
          (schemaExample as string | undefined) ??
          fallbackExampleForParam(param.name);
        // Dredd's URI template expansion reads `parameter.example` first
        // and falls back to `parameter.schema.example`. Mirror the value
        // to both so the spec is unambiguous regardless of which path the
        // tooling takes.
        param.example = example;
        if (param.schema) param.schema.example = example;
      }
    }
  }
}

function buildResponses(route: Route): Record<string, unknown> {
  const status = buildSuccessStatus(route);
  if (route.binary) {
    return {
      [status]: {
        description: 'Binary response',
        content: {
          [route.binary.mediaType]: {
            schema: { type: 'string', format: 'binary' },
          },
        },
      },
    };
  }
  if (route.response && isZodSchema(route.response)) {
    return {
      [status]: {
        description: 'Successful response',
        content: { 'application/json': { schema: route.response } },
      },
    };
  }
  return { [status]: { description: 'Successful response' } };
}

function convertPath(input: string): { path: string; pathParams: string[] } {
  const pathParams: string[] = [];
  const path = input.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    pathParams.push(name);
    return `{${name}}`;
  });
  return { path, pathParams };
}

function operationName(route: Route): string {
  const base = route.sdk?.name ?? `${route.method.toLowerCase()}_${route.path}`;
  return base.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * P1-062 — auto-promote each route's body/response schema into the
 * shared `components.schemas` table when it carries `.openapi('Name')`
 * metadata (or a `_def.openapi.metadata.id` shape from
 * `zod-to-openapi`). Schemas without metadata stay inlined per the
 * old behaviour. This is opt-in per schema, so callers can register
 * the bodies/responses they want to reuse and skip the trivial ones.
 */
function maybeRegisterNamedSchema(schema: ZodSchema<unknown>, registry: OpenAPIRegistry): void {
  const meta = (
    schema as unknown as {
      _def?: { openapi?: { metadata?: { id?: string } } };
    }
  )._def?.openapi?.metadata;
  const id = meta?.id;
  if (!id) return;
  // Idempotent: register the same id twice would throw.
  try {
    registry.register(id, schema);
  } catch {
    // Already registered — fine, the same Zod instance is referenced
    // from more than one route.
  }
}

function registerRoute(route: Route, registry: OpenAPIRegistry): void {
  const { path, pathParams } = convertPath(route.path);
  const opName = operationName(route);

  if (route.body && isZodSchema(route.body)) {
    maybeRegisterNamedSchema(route.body as ZodSchema<unknown>, registry);
  }
  if (route.response && isZodSchema(route.response)) {
    maybeRegisterNamedSchema(route.response as ZodSchema<unknown>, registry);
  }

  const paramsSchema = buildPathParamsSchema(route, pathParams);
  const querySchema = unwrapToZodObject(route.query);
  const bodySchema = route.body && isZodSchema(route.body) ? route.body : undefined;

  registry.registerPath({
    method: route.method.toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'patch'
      | 'delete'
      | 'head'
      | 'options',
    path: `/api${path}`,
    summary: route.openapi.summary,
    description: route.openapi.description,
    tags: [...route.openapi.tags],
    operationId: route.sdk?.name ?? opName,
    request: {
      params: paramsSchema,
      query: querySchema,
      body: bodySchema ? { content: { 'application/json': { schema: bodySchema } } } : undefined,
    },
    responses: buildResponses(route) as never,
  });
}

async function generate(): Promise<void> {
  const registry = new OpenAPIRegistry();
  const routes = await loadRoutes();

  for (const route of routes) {
    try {
      registerRoute(route, registry);
    } catch (err) {
      console.warn(
        `Failed to register ${route.method} ${route.path}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Profile Services API',
      version: '0.2.3',
      description: 'Generated from framework-free Route descriptors (Elysia + Bun runtime).',
    },
    servers: [{ url: 'http://localhost:3010' }],
  });

  injectFallbackExamples(document);

  const tagSet = new Set<string>();
  for (const route of routes) for (const t of route.openapi.tags) tagSet.add(t);
  document.tags = [...tagSet].sort().map((name) => ({ name }));

  const report: SwaggerReport = {
    success: true,
    generatedBy: 'route-descriptors',
    paths: Object.keys(document.paths ?? {}).length,
    operations: routes.length,
    schemas: Object.keys(document.components?.schemas ?? {}).length,
    tags: [...tagSet].sort(),
  };

  writeFileSync(SWAGGER_PATH, `${JSON.stringify(document, null, 2)}\n`);
  // Client spec: same shape; the previous Nest path stripped admin
  // routes via `unwrapClientSpec`. Until that rule is reapplied at the
  // descriptor level, the client spec equals the server spec.
  writeFileSync(CLIENT_SWAGGER_PATH, `${JSON.stringify(document, null, 2)}\n`);
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Swagger JSON generated: ${SWAGGER_PATH}`);
  console.log(`Client spec generated: ${CLIENT_SWAGGER_PATH}`);
  console.log(`Paths: ${report.paths}`);
  console.log(`Operations: ${report.operations}`);
  console.log(`Schemas: ${report.schemas}`);
}

generate().catch((error: unknown) => {
  console.error('Failed to generate swagger.json');
  console.error(error);
  process.exitCode = 1;
});
