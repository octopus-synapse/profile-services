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

/** Routes that the client SDK should not generate a callable for.
 *  SSE/stream stay in the server doc but not in client-swagger.json.
 *  Redirect routes (OAuth start/callback) are meant for browser
 *  navigation — clients use a `window.location.href` helper, not Orval. */
function excludedFromSdk(route: Route): boolean {
  if (route.kind === 'sse' || route.kind === 'redirect') return true;
  // `stream` without `binary` is raw text (e.g. Prometheus /metrics).
  if (route.kind === 'stream' && !route.binary) return true;
  return false;
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

interface JsonSchema {
  type?: string;
  format?: string;
  enum?: ReadonlyArray<string | number | boolean>;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchema;
  description?: string;
}

/**
 * Lossy Zod → JSON Schema converter for query/path parameters.
 *
 * `OpenApiGeneratorV3.generateDocument` unwraps Zod schemas in request
 * bodies and responses, but **not** in `parameters[].schema`. Without
 * this helper, the raw `_def` and `~standard` keys leak into the
 * generated swagger and Orval rejects the spec.
 */
function zodToJsonSchema(schema: ZodSchema<unknown>): JsonSchema {
  const def = (schema as unknown as { _def?: { typeName?: string; [k: string]: unknown } })._def;
  const typeName = def?.typeName;

  switch (typeName) {
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault': {
      const inner = (def as { innerType?: ZodSchema<unknown> }).innerType;
      const child = inner ? zodToJsonSchema(inner) : { type: 'string' };
      if (typeName === 'ZodDefault') {
        const defaultValue = (def as { defaultValue?: () => unknown }).defaultValue?.();
        if (defaultValue !== undefined) child.default = defaultValue;
      }
      return child;
    }
    case 'ZodEffects': {
      const inner = (def as { schema?: ZodSchema<unknown> }).schema;
      return inner ? zodToJsonSchema(inner) : { type: 'string' };
    }
    case 'ZodString': {
      const out: JsonSchema = { type: 'string' };
      const checks =
        (def as { checks?: ReadonlyArray<{ kind: string; value?: unknown }> }).checks ?? [];
      for (const c of checks) {
        if (c.kind === 'min' && typeof c.value === 'number') out.minLength = c.value;
        if (c.kind === 'max' && typeof c.value === 'number') out.maxLength = c.value;
        if (c.kind === 'email') out.format = 'email';
        if (c.kind === 'url') out.format = 'uri';
        if (c.kind === 'uuid') out.format = 'uuid';
        if (c.kind === 'cuid' || c.kind === 'cuid2') out.format = c.kind;
        if (c.kind === 'datetime') out.format = 'date-time';
        if (c.kind === 'regex' && c.value instanceof RegExp) out.pattern = c.value.source;
      }
      return out;
    }
    case 'ZodNumber': {
      const out: JsonSchema = { type: 'number' };
      const checks =
        (def as { checks?: ReadonlyArray<{ kind: string; value?: number }> }).checks ?? [];
      let isInt = false;
      for (const c of checks) {
        if (c.kind === 'int') isInt = true;
        if (c.kind === 'min' && typeof c.value === 'number') out.minimum = c.value;
        if (c.kind === 'max' && typeof c.value === 'number') out.maximum = c.value;
      }
      if (isInt) out.type = 'integer';
      return out;
    }
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodEnum': {
      const values = (def as { values?: readonly string[] }).values ?? [];
      return { type: 'string', enum: values };
    }
    case 'ZodNativeEnum': {
      const values = Object.values((def as { values?: Record<string, unknown> }).values ?? {});
      const stringValues = values.filter((v): v is string => typeof v === 'string');
      return { type: 'string', enum: stringValues };
    }
    case 'ZodLiteral': {
      const value = (def as { value?: unknown }).value;
      if (typeof value === 'string') return { type: 'string', enum: [value] };
      if (typeof value === 'number') return { type: 'number', enum: [value] };
      if (typeof value === 'boolean') return { type: 'boolean', enum: [value] };
      return { type: 'string' };
    }
    case 'ZodArray': {
      const inner = (def as { type?: ZodSchema<unknown> }).type;
      return { type: 'array', items: inner ? zodToJsonSchema(inner) : { type: 'string' } };
    }
    default:
      return { type: 'string' };
  }
}

function convertPath(input: string): { path: string; pathParams: string[] } {
  const pathParams: string[] = [];
  const path = input.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    pathParams.push(name);
    return `{${name}}`;
  });
  return { path, pathParams };
}

/**
 * Derive a camelCase operationId from the route metadata. Pattern:
 *   `<tag><PathTailSegments>`     for GET-list (no path params)
 *   `<tag>GetById`                for GET single by id
 *   `<tag>Create / Update / Delete` for canonical CRUD
 *   `<tag><PathTail>`             for everything else
 *
 * `sdk.name`, when explicitly set, wins. Anything else falls back to the
 * legacy `<method>_<path>` form so we can still spot routes that should
 * have a friendly name.
 */
function operationName(route: Route): string {
  const tag = route.openapi.tags[0] ?? 'misc';
  const tagCamel = tag
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((seg, i) =>
      i === 0 ? seg.toLowerCase() : seg[0].toUpperCase() + seg.slice(1).toLowerCase(),
    )
    .join('');

  if (route.sdk?.name) {
    // Prefix the explicit sdk.name with the BC tag so the generated
    // function lands inside its bounded-context namespace (matches the
    // old NestJS-derived `<tag>.<methodName>` pattern that the frontend
    // hooks already consume).
    const cleanName = route.sdk.name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const tail = cleanName[0].toUpperCase() + cleanName.slice(1);
    return `${tagCamel}${tail}`;
  }

  // Strip leading "/v1/" or "/" then drop any leading segments whose
  // concatenation reproduces the tag — this handles multi-word tags
  // (e.g. tag `admin-section-types` + path `/v1/admin/section-types/:id`
  // would otherwise echo "AdminSectionTypes" twice).
  const cleanPath = route.path.replace(/^\/+(v\d+\/)?/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  const tagLower = tag.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const trimmed: string[] = [];
  let consumed = '';
  let stillEatingTag = true;
  for (const seg of segments) {
    if (stillEatingTag) {
      const next = `${consumed}${seg.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
      if (tagLower.startsWith(next) || next.startsWith(tagLower)) {
        consumed = next;
        if (consumed === tagLower || consumed.startsWith(tagLower)) {
          stillEatingTag = false;
        }
        continue;
      }
      stillEatingTag = false;
    }
    trimmed.push(seg);
  }
  const verbal = trimmed
    .filter((s) => !s.startsWith(':'))
    .map((s) =>
      s
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
        .join(''),
    )
    .join('');

  const hasPathParam = segments.some((s) => s.startsWith(':'));
  const method = route.method.toLowerCase();
  const methodCap = method[0].toUpperCase() + method.slice(1);

  let action = '';
  // Bare resource (no path tail beyond the tag): emit canonical CRUD names.
  if (verbal === '') {
    if (hasPathParam && method === 'get') action = 'GetById';
    else if (hasPathParam && (method === 'patch' || method === 'put')) action = 'Update';
    else if (hasPathParam && method === 'delete') action = 'Delete';
    else if (method === 'get') action = 'List';
    else if (method === 'post') action = 'Create';
    else action = methodCap;
  } else {
    // Path tail present: drop the method prefix; the collision-resolution
    // pass adds it only when the same path tail produces clashing IDs.
    action = verbal;
  }

  return `${tagCamel}${action}`;
}

function registerRoute(route: Route, registry: OpenAPIRegistry, overrideId?: string): void {
  const { path, pathParams } = convertPath(route.path);
  const opName = overrideId ?? operationName(route);

  const parameters: Array<{
    name: string;
    in: 'path' | 'query';
    required: boolean;
    schema: JsonSchema;
  }> = pathParams.map((name) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));

  // Per-property query params from a ZodObject. Convert each Zod sub-schema
  // to a plain JSON Schema fragment — `OpenApiGeneratorV3` does not unwrap
  // Zod schemas inside `parameters[].schema`, so passing the raw object
  // would leak `_def` / `~standard` into the generated swagger.
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
          schema: zodToJsonSchema(sub as ZodSchema<unknown>),
        });
      }
    }
  }

  // Build the responses object based on route shape:
  //  - `kind: 'redirect'` → 302 Found with Location header.
  //  - `route.binary` set → 200 with binary content type.
  //  - `route.response` set → 200 with JSON schema.
  //  - otherwise → 200 with no schema (used by SSE/stream routes).
  let responses: Record<string, unknown>;
  if (route.kind === 'redirect') {
    responses = {
      302: {
        description: 'Redirect',
        headers: {
          Location: { description: 'Target URL', schema: { type: 'string' } },
        },
      },
    };
  } else if (route.binary) {
    const contentDispHeader = route.binary.filename
      ? {
          'Content-Disposition': {
            description: `attachment; filename="${route.binary.filename}"`,
            schema: { type: 'string' },
          },
        }
      : undefined;
    responses = {
      200: {
        description: 'Binary file response',
        content: {
          [route.binary.mediaType]: {
            schema: { type: 'string', format: 'binary' },
          },
        },
        ...(contentDispHeader ? { headers: contentDispHeader } : {}),
      },
    };
  } else {
    responses = {
      200:
        route.response && isZodSchema(route.response)
          ? {
              description: 'Successful response',
              content: { 'application/json': { schema: route.response } },
            }
          : { description: 'Successful response' },
    };
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
    operationId: opName,
    parameters: parameters as never,
    request:
      route.body && isZodSchema(route.body)
        ? { body: { content: { 'application/json': { schema: route.body } } } }
        : undefined,
    responses: responses as never,
  });
}

async function generate(): Promise<void> {
  const registry = new OpenAPIRegistry();
  const clientRegistry = new OpenAPIRegistry();
  const routes = await loadRoutes();

  // T12 — sdk.exported enforcement.
  // Default: a JSON route is part of the client SDK. Opt-out with
  // `sdk: { exported: false }` (used for legacy aliases and admin-only
  // endpoints). SSE / stream / redirect routes are always omitted from
  // the client spec but stay in the server spec for documentation.
  const omittedFromSdk: Array<{ method: string; path: string; reason: string }> = [];
  for (const route of routes) {
    if (excludedFromSdk(route)) continue;
    if (route.sdk?.exported === false) {
      omittedFromSdk.push({
        method: route.method,
        path: route.path,
        reason: 'sdk.exported=false',
      });
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

  // Pre-compute operationIds so we can disambiguate collisions before
  // registering with the OpenAPI generator (Orval rejects duplicate IDs).
  const idCounts = new Map<string, number>();
  for (const route of routes) {
    const id = operationName(route);
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  const colliding = new Set<string>();
  for (const [id, count] of idCounts) {
    if (count > 1) colliding.add(id);
  }
  const opIdByRoute = new WeakMap<Route, string>();
  const seen = new Set<string>();
  for (const route of routes) {
    let id = operationName(route);
    if (colliding.has(id)) {
      const methodSuffix = route.method[0].toUpperCase() + route.method.slice(1).toLowerCase();
      id = `${id}${methodSuffix}`;
    }
    let candidate = id;
    let n = 2;
    while (seen.has(candidate)) {
      candidate = `${id}${n}`;
      n += 1;
    }
    seen.add(candidate);
    opIdByRoute.set(route, candidate);
  }

  for (const route of routes) {
    try {
      registerRoute(route, registry, opIdByRoute.get(route));
      // Mirror to client registry only when SDK-eligible (default: yes).
      if (!excludedFromSdk(route) && route.sdk?.exported !== false) {
        registerRoute(route, clientRegistry, opIdByRoute.get(route));
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
      routes.length - omittedFromSdk.length - routes.filter(excludedFromSdk).length,
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
