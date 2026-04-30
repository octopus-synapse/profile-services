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
import { type ZodSchema, z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';

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
  for (const entry of readdirSync(dir)) {
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
  return all;
}

function isZodSchema(value: unknown): value is ZodSchema<unknown> {
  return typeof value === 'object' && value !== null && '_def' in value;
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

function registerRoute(route: Route, registry: OpenAPIRegistry): void {
  const { path, pathParams } = convertPath(route.path);
  const opName = operationName(route);

  const parameters: Array<{
    name: string;
    in: 'path' | 'query';
    required: boolean;
    schema: ZodSchema<unknown>;
  }> = pathParams.map((name) => ({
    name,
    in: 'path',
    required: true,
    schema: z.string(),
  }));

  // Per-property query params from a ZodObject.
  if (isZodSchema(route.query)) {
    const def = (
      route.query as unknown as {
        _def?: { typeName?: string; shape?: () => Record<string, ZodSchema<unknown>> };
      }
    )._def;
    if (def?.typeName === 'ZodObject' && typeof def.shape === 'function') {
      for (const [name, sub] of Object.entries(def.shape())) {
        parameters.push({
          name,
          in: 'query',
          required: !(sub as ZodSchema<unknown>).isOptional?.(),
          schema: sub,
        });
      }
    }
  }

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
    parameters: parameters as never,
    request:
      route.body && isZodSchema(route.body)
        ? { body: { content: { 'application/json': { schema: route.body } } } }
        : undefined,
    responses: {
      200:
        route.response && isZodSchema(route.response)
          ? {
              description: 'Successful response',
              content: { 'application/json': { schema: route.response } },
            }
          : { description: 'Successful response' },
    },
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
