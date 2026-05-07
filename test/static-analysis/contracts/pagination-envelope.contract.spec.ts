import { beforeAll, describe, expect, test } from 'bun:test';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ZodSchema } from 'zod';
import type { Route } from '@/shared-kernel/http/route';

const SRC_DIR = resolve(__dirname, '../../../src');

function* walkRoutesFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir).sort()) {
    if (entry === 'node_modules' || entry === '__tests__' || entry === 'testing') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkRoutesFiles(full);
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

interface ZodInternals {
  readonly _def?: {
    readonly typeName?: string;
    readonly shape?: () => Record<string, ZodSchema<unknown>>;
    readonly innerType?: ZodSchema<unknown>;
    readonly schema?: ZodSchema<unknown>;
  };
}

function getTypeName(schema: unknown): string | undefined {
  return (schema as ZodInternals)?._def?.typeName;
}

function unwrapToZodObject(schema: unknown): Record<string, ZodSchema<unknown>> | undefined {
  let current: unknown = schema;
  for (let depth = 0; depth < 5; depth += 1) {
    const typeName = getTypeName(current);
    if (typeName === 'ZodObject') {
      const shapeFn = (current as ZodInternals)._def?.shape;
      return typeof shapeFn === 'function' ? shapeFn() : undefined;
    }
    if (typeName === 'ZodEffects' || typeName === 'ZodPipeline') {
      const inner = (current as ZodInternals)._def?.schema;
      if (!inner) return undefined;
      current = inner;
      continue;
    }
    if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
      const inner = (current as ZodInternals)._def?.innerType;
      if (!inner) return undefined;
      current = inner;
      continue;
    }
    return undefined;
  }
  return undefined;
}

function isPaginatedQuery(query: unknown): 'offset' | 'cursor' | null {
  const shape = unwrapToZodObject(query);
  if (!shape) return null;
  if ('cursor' in shape) return 'cursor';
  if ('page' in shape || 'offset' in shape) return 'offset';
  return null;
}

const OFFSET_REQUIRED_KEYS = [
  'items',
  'total',
  'page',
  'limit',
  'totalPages',
  'hasNext',
  'hasPrev',
] as const;

const CURSOR_REQUIRED_KEYS = ['items', 'nextCursor', 'hasNext'] as const;

function isPaginatedResponse(response: unknown): 'offset' | 'cursor' | null {
  const shape = unwrapToZodObject(response);
  if (!shape || !shape.items) return null;
  if (CURSOR_REQUIRED_KEYS.every((k) => k in shape)) return 'cursor';
  if (OFFSET_REQUIRED_KEYS.every((k) => k in shape)) return 'offset';
  return null;
}

interface CollectedRoute {
  readonly file: string;
  readonly route: Route;
}

const collected: CollectedRoute[] = [];

beforeAll(async () => {
  for (const file of walkRoutesFiles(SRC_DIR)) {
    try {
      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      for (const value of Object.values(mod)) {
        if (isRouteArray(value)) {
          for (const route of value) collected.push({ file, route: route as Route });
        }
      }
    } catch {
      // Module load failure surfaces in tsc / route-descriptors contract.
    }
  }
});

describe('Pagination envelope contract', () => {
  test('every list endpoint (page or cursor query) returns the canonical paginated envelope', () => {
    const offenders: string[] = [];
    for (const { route } of collected) {
      const queryKind = isPaginatedQuery(route.query);
      if (!queryKind) continue;
      const responseKind = isPaginatedResponse(route.response);
      if (responseKind !== queryKind) {
        offenders.push(
          `${route.method} ${route.path} :: query=${queryKind} response=${responseKind ?? 'NOT_PAGINATED'}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  test('paginated responses expose all canonical envelope keys', () => {
    const offenders: string[] = [];
    for (const { route } of collected) {
      if (!route.response) continue;
      const kind = isPaginatedResponse(route.response);
      if (!kind) continue;
      const shape = unwrapToZodObject(route.response);
      if (!shape) continue;
      const requiredKeys = kind === 'cursor' ? CURSOR_REQUIRED_KEYS : OFFSET_REQUIRED_KEYS;
      const missing = requiredKeys.filter((k) => !(k in shape));
      if (missing.length > 0) {
        offenders.push(
          `${route.method} ${route.path} :: ${kind} envelope missing [${missing.join(', ')}]`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });
});
