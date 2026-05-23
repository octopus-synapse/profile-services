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
import { PERMISSION_GROUPS, ROLES } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { NAME_TO_EXAMPLE } from '@/shared-kernel/schemas/params/auto-derive-examples.const';
import { EXAMPLE_SLUG } from '@/shared-kernel/schemas/params/example-values.const';

/**
 * Permissions that the standard `role_user` does NOT have — i.e.
 * routes guarded by these require the admin persona to succeed. The
 * admin role carries `admin:full_access` which bypasses every check,
 * so any permission outside the user's explicit grant is effectively
 * admin-only. Emitted into `swagger.info['x-admin-permissions']` for
 * the Dredd hook to consume.
 */
function permissionToString(perm: Route['permission']): string | null {
  if (perm === undefined) return null;
  if (typeof perm === 'string') return perm;
  if (typeof perm === 'object' && 'resource' in perm && 'action' in perm) {
    return `${perm.resource}:${perm.action}`;
  }
  return null;
}

function computeAdminOnlyPermissions(routes: ReadonlyArray<Route>): string[] {
  const userPerms = new Set<string>();
  for (const gid of ROLES.USER.groups) {
    const grp = Object.values(PERMISSION_GROUPS).find((g) => g.id === gid);
    if (!grp) continue;
    for (const p of grp.permissions) userPerms.add(String(p));
  }
  const adminOnly = new Set<string>();
  for (const route of routes) {
    const perm = permissionToString(route.permission);
    if (!perm) continue;
    if (!userPerms.has(perm)) adminOnly.add(perm);
  }
  return [...adminOnly].sort();
}

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

interface OpenApiParameter {
  name?: string;
  in?: string;
  required?: boolean;
  example?: unknown;
  schema?: { example?: unknown; enum?: unknown[] };
}

interface OpenApiOperation {
  parameters?: OpenApiParameter[];
}

/**
 * Mirror the `NAME_TO_EXAMPLE` auto-derive map (used by the
 * route-examples contract test) onto the generated OpenAPI parameters.
 *
 * The contract test treats a leaf as covered when either (a) the Zod
 * schema declares `.openapi({ example })` or (b) the field name has an
 * entry in NAME_TO_EXAMPLE. `zod-to-openapi` only emits (a), so this
 * pass restores parity by injecting (b) on path + required-query
 * parameters that arrived without an example. Single source of truth =
 * `auto-derive-examples.const.ts`.
 */
function applyParameterAutoDeriveExamples(document: {
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
        const enumValues = param.schema?.enum;
        const enumFallback =
          Array.isArray(enumValues) && enumValues.length > 0
            ? (enumValues[0] as string)
            : undefined;
        // Dredd's URI-template expansion reads `parameter.example` first,
        // then `parameter.schema.example`. Mirror the value to both so
        // every consumer sees the same example regardless of which path
        // it walks. Precedence: explicit > schema > NAME_TO_EXAMPLE > enum > slug.
        const example =
          (param.example as string | undefined) ??
          (param.schema?.example as string | undefined) ??
          NAME_TO_EXAMPLE.get(param.name) ??
          enumFallback ??
          EXAMPLE_SLUG;
        param.example = example;
        if (param.schema) param.schema.example = example;
      }
    }
  }
}

// Standard error envelope (`ErrorResponseSchema` shape). Rendered as
// plain OpenAPI so the generator stays self-contained and the
// `has-4xx-response` Spectral rule clears for every route.
const ERROR_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['statusCode', 'code', 'message', 'severity'],
  properties: {
    statusCode: { type: 'integer' },
    code: { type: 'string' },
    message: { type: 'string' },
    severity: { type: 'string', enum: ['toast', 'modal', 'banner', 'inline', 'silent'] },
  },
} as const;

function buildErrorResponse(description: string): Record<string, unknown> {
  return {
    description,
    content: { 'application/json': { schema: ERROR_RESPONSE_SCHEMA } },
  };
}

interface OpenApiHeaderSchema {
  type: 'string' | 'number' | 'integer' | 'boolean';
  format?: string;
  example?: unknown;
}

/**
 * Convert a single header's Zod schema into an OpenAPI 3.0 Schema
 * Object. `zod-to-openapi` only auto-converts Zod schemas placed
 * inside `content[mediaType].schema`; the `responses[].headers[].schema`
 * path receives whatever we hand it untouched, so we'd otherwise leak
 * `_def` / `~standard` Zod internals into the spec (Spectral fails the
 * `oas3-schema` rule on those keys).
 */
function zodHeaderToOpenApi(zod: ZodSchema<unknown>): OpenApiHeaderSchema {
  type ZodInternals = {
    _def?: {
      typeName?: string;
      innerType?: ZodSchema<unknown>;
      openapi?: { metadata?: { example?: unknown; format?: string } };
    };
  };
  let current = zod as ZodInternals;
  let collectedExample: unknown;
  let collectedFormat: string | undefined;
  for (let depth = 0; depth < 5; depth += 1) {
    const meta = current._def?.openapi?.metadata;
    if (collectedExample === undefined && meta?.example !== undefined) {
      collectedExample = meta.example;
    }
    if (collectedFormat === undefined && meta?.format !== undefined) {
      collectedFormat = meta.format;
    }
    const tn = current._def?.typeName;
    if (tn === 'ZodOptional' || tn === 'ZodNullable' || tn === 'ZodDefault') {
      current = current._def?.innerType as unknown as ZodInternals;
      continue;
    }
    break;
  }
  const typeName = current._def?.typeName;
  const out: OpenApiHeaderSchema =
    typeName === 'ZodNumber'
      ? { type: 'number' }
      : typeName === 'ZodBoolean'
        ? { type: 'boolean' }
        : typeName === 'ZodBigInt' || typeName === 'ZodInt'
          ? { type: 'integer' }
          : { type: 'string' };
  if (collectedFormat) out.format = collectedFormat;
  if (collectedExample !== undefined) out.example = collectedExample;
  return out;
}

function buildResponseHeaders(
  route: Route,
): Record<string, { schema: OpenApiHeaderSchema; required: boolean }> | undefined {
  const headersSchema = unwrapToZodObject(route.responseHeaders);
  if (!headersSchema) return undefined;
  const out: Record<string, { schema: OpenApiHeaderSchema; required: boolean }> = {};
  const shape = headersSchema._def.shape() as Record<string, ZodSchema<unknown>>;
  for (const [name, sub] of Object.entries(shape)) {
    out[name] = {
      schema: zodHeaderToOpenApi(sub),
      required: !(sub as { isOptional?: () => boolean }).isOptional?.(),
    };
  }
  return out;
}

/**
 * Stamp each operation with `x-permission` carrying the route's
 * declared `Permission` string (or `null` for routes with `auth: jwt`
 * but no specific permission, or absent for `auth: public`).
 *
 * Consumed by the contract test engine (`pickPersona` in
 * `test/infrastructure/contract/engine/route-classifier.ts`) so probes
 * pick the right persona per route from actual authorization metadata.
 */
function applyOperationPermissionExtension(
  document: { paths?: Record<string, Record<string, unknown>> },
  routes: ReadonlyArray<Route>,
): void {
  for (const route of routes) {
    const { path } = convertPath(route.path);
    const fullPath = `/api${path}`;
    const ops = document.paths?.[fullPath];
    if (!ops) continue;
    const op = ops[route.method.toLowerCase()] as { [key: string]: unknown } | undefined;
    if (!op) continue;
    if (route.auth.kind === 'public') {
      op['x-auth'] = 'public';
    } else {
      op['x-auth'] = 'jwt';
      const permStr = permissionToString(route.permission);
      if (permStr !== null) {
        op['x-permission'] = permStr;
      }
    }
    // Emit `x-guards` so consumers (Dredd hook, drift script, SDK
    // generators) know about additional gates on top of `x-auth`/
    // `x-permission` — e.g. `internal-auth` (service-to-service
    // token), `rate-limit`, `skip-tos-check`. The guards array
    // mirrors the route descriptor's `guards` property.
    if (route.guards && route.guards.length > 0) {
      op['x-guards'] = route.guards.map((g) => g.id);
    }
  }
}

/**
 * Lift `description` (and a few other docs-only metadata keys) from an
 * inline `allOf` member — or from the `$ref` target — up to the
 * property's top level. The spectral `schema-properties-description`
 * rule walks `properties.*` and checks `description` directly; it does
 * not merge `allOf` or follow `$ref` for non-resolved fields. `allOf`
 * shapes are emitted by `zod-to-openapi` whenever a property references
 * a registered component AND the inline ZodSchema diverges from the
 * registered schema (e.g. multiple `.regex()` calls on `PasswordSchema`
 * where only the first is picked up). OpenAPI semantically merges the
 * allOf and inherits from the $ref target, so promoting these fields
 * is a no-op for any consumer.
 */
function liftAllOfDescriptionToTopLevel(document: {
  components?: { schemas?: Record<string, unknown> };
}): void {
  const schemas = document.components?.schemas;
  if (!schemas) return;
  const LIFT_KEYS = ['description', 'example', 'title'] as const;
  const resolveRef = (ref: string): Record<string, unknown> | undefined => {
    // Expected shape: '#/components/schemas/<Name>'
    const prefix = '#/components/schemas/';
    if (!ref.startsWith(prefix)) return undefined;
    const name = ref.slice(prefix.length);
    return schemas[name] as Record<string, unknown> | undefined;
  };
  for (const schemaName of Object.keys(schemas)) {
    const schema = schemas[schemaName] as { properties?: Record<string, unknown> };
    if (!schema || typeof schema !== 'object' || !schema.properties) continue;
    for (const propName of Object.keys(schema.properties)) {
      const prop = schema.properties[propName] as
        | { allOf?: Array<Record<string, unknown>>; [k: string]: unknown }
        | undefined;
      if (!prop || typeof prop !== 'object' || !Array.isArray(prop.allOf)) continue;
      for (const key of LIFT_KEYS) {
        if (prop[key] !== undefined) continue;
        for (const member of prop.allOf) {
          if (!member || typeof member !== 'object') continue;
          if (member[key] !== undefined) {
            prop[key] = member[key];
            break;
          }
          const ref = member.$ref as string | undefined;
          if (typeof ref === 'string') {
            const target = resolveRef(ref);
            if (target && target[key] !== undefined) {
              prop[key] = target[key];
              break;
            }
          }
        }
      }
    }
  }
}

function buildResponses(route: Route): Record<string, unknown> {
  const status = buildSuccessStatus(route);
  const errors: Record<string, unknown> = {
    '400': buildErrorResponse('Validation error'),
  };
  if (route.auth.kind === 'jwt') {
    errors['401'] = buildErrorResponse('Authentication required');
  }
  if (route.permission !== undefined) {
    errors['403'] = buildErrorResponse('Forbidden');
  }
  if (/:\w+/.test(route.path)) {
    errors['404'] = buildErrorResponse('Not found');
  }
  const headers = buildResponseHeaders(route);
  if (route.binary) {
    return {
      [status]: {
        description: 'Binary response',
        content: {
          [route.binary.mediaType]: {
            schema: { type: 'string', format: 'binary' },
          },
        },
        ...(headers && { headers }),
      },
      ...errors,
    };
  }
  if (route.response && isZodSchema(route.response)) {
    return {
      [status]: {
        description: 'Successful response',
        content: { 'application/json': { schema: route.response } },
        ...(headers && { headers }),
      },
      ...errors,
    };
  }
  return {
    [status]: { description: 'Successful response', ...(headers && { headers }) },
    ...errors,
  };
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

  // Routes under `/.well-known/` (AASA, assetlinks) are mounted at the
  // root path by the bootstrap (no `/api` prefix) because Apple/Google
  // crawlers expect them at `https://<host>/.well-known/…` exactly.
  const isWellKnown = path.startsWith('/.well-known/');
  const fullPath = isWellKnown ? path : `/api${path}`;
  registry.registerPath({
    method: route.method.toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'patch'
      | 'delete'
      | 'head'
      | 'options',
    path: fullPath,
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
      'x-admin-permissions': computeAdminOnlyPermissions(routes),
    } as never,
    servers: [{ url: 'http://localhost:3010' }],
  });

  applyParameterAutoDeriveExamples(document);
  applyOperationPermissionExtension(document, routes);
  liftAllOfDescriptionToTopLevel(document);

  // Final stability pass — explicitly rebuild `paths` in alphabetical
  // order so JSON serialisation is identical across hosts regardless
  // of how the registry walked its definitions.
  if (document.paths) {
    const sortedPaths: Record<string, unknown> = {};
    for (const key of Object.keys(document.paths).sort()) {
      sortedPaths[key] = document.paths[key];
    }
    document.paths = sortedPaths;
  }

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
