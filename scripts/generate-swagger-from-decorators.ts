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
  readonly clientPaths: number;
  readonly clientOperations: number;
  readonly omittedFromSdk: ReadonlyArray<{ method: string; path: string; reason: string }>;
}

const ENFORCEMENT_MODE: 'warn' | 'error' =
  (process.env.SDK_ENFORCEMENT as 'warn' | 'error' | undefined) ?? 'warn';

function isStreamingRoute(route: Route): boolean {
  return route.kind === 'sse' || route.kind === 'stream';
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
  const clientRegistry = new OpenAPIRegistry();
  const routes = await loadRoutes();

  // T12 — sdk.exported enforcement.
  // Every JSON route is expected to opt into the SDK explicitly via
  // `sdk: { exported: true }`. SSE / stream routes are always omitted
  // from the client spec but stay in the server spec for documentation.
  const omittedFromSdk: Array<{ method: string; path: string; reason: string }> = [];
  for (const route of routes) {
    if (isStreamingRoute(route)) continue;
    if (route.sdk?.exported !== true) {
      const reason = route.sdk?.exported === false ? 'sdk.exported=false' : 'sdk-missing';
      omittedFromSdk.push({ method: route.method, path: route.path, reason });
    }
  }
  if (omittedFromSdk.length > 0) {
    const banner = ENFORCEMENT_MODE === 'error' ? 'Error' : 'Warning';
    console.warn(
      `\n[${banner}] ${omittedFromSdk.length} JSON route(s) omitted from client SDK:\n` +
        omittedFromSdk.map((r) => `  - ${r.method} ${r.path} (${r.reason})`).join('\n'),
    );
    if (ENFORCEMENT_MODE === 'error') {
      throw new Error(
        `SDK enforcement: ${omittedFromSdk.length} route(s) missing sdk.exported:true. Set SDK_ENFORCEMENT=warn to downgrade to a warning.`,
      );
    }
  }

  for (const route of routes) {
    try {
      registerRoute(route, registry);
      // Mirror to client registry only when SDK-eligible.
      if (!isStreamingRoute(route) && route.sdk?.exported === true) {
        registerRoute(route, clientRegistry);
      }
    } catch (err) {
      console.warn(
        `Failed to register ${route.method} ${route.path}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const baseDocOptions = {
    openapi: '3.0.0' as const,
    info: {
      title: 'Profile Services API',
      version: '2.0.0',
      description: 'Generated from framework-free Route descriptors (Elysia + Bun runtime).',
    },
    servers: [{ url: 'http://localhost:3010' }],
  };

  const document = new OpenApiGeneratorV3(registry.definitions).generateDocument(baseDocOptions);
  const clientDocument = new OpenApiGeneratorV3(clientRegistry.definitions).generateDocument({
    ...baseDocOptions,
    info: {
      ...baseDocOptions.info,
      description: `${baseDocOptions.info.description} (Client-only spec — SSE/stream routes omitted.)`,
    },
  });

  const tagSet = new Set<string>();
  for (const route of routes) for (const t of route.openapi.tags) tagSet.add(t);
  document.tags = [...tagSet].sort().map((name) => ({ name }));
  clientDocument.tags = document.tags;

  const report: SwaggerReport = {
    success: true,
    generatedBy: 'route-descriptors',
    paths: Object.keys(document.paths ?? {}).length,
    operations: routes.length,
    schemas: Object.keys(document.components?.schemas ?? {}).length,
    tags: [...tagSet].sort(),
    clientPaths: Object.keys(clientDocument.paths ?? {}).length,
    clientOperations:
      routes.length - omittedFromSdk.length - routes.filter(isStreamingRoute).length,
    omittedFromSdk,
  };

  writeFileSync(SWAGGER_PATH, `${JSON.stringify(document, null, 2)}\n`);
  writeFileSync(CLIENT_SWAGGER_PATH, `${JSON.stringify(clientDocument, null, 2)}\n`);
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Swagger JSON generated: ${SWAGGER_PATH}`);
  console.log(`Client spec generated: ${CLIENT_SWAGGER_PATH}`);
  console.log(`Paths: ${report.paths} (client: ${report.clientPaths})`);
  console.log(`Operations: ${report.operations} (client: ${report.clientOperations})`);
  console.log(`Schemas: ${report.schemas}`);
  if (omittedFromSdk.length > 0) {
    console.log(`Omitted from SDK: ${omittedFromSdk.length} (mode=${ENFORCEMENT_MODE})`);
  }
}

generate().catch((error: unknown) => {
  console.error('Failed to generate swagger.json');
  console.error(error);
  process.exitCode = 1;
});
