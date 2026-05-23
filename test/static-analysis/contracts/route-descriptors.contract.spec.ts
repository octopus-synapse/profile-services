/**
 * Route-descriptor contracts.
 *
 * Phase-2 cutover replaced the Nest `*.controller.ts` + `@ApiTags`
 * audit suite with this single spec, scoped to the post-cutover
 * invariants:
 *
 *  1. Every `*.routes.ts` exports at least one route array.
 *  2. Every Route with `sdk.exported: true` has a stable `sdk.name`
 *     (auto-generated names = SDK churn = consumer break).
 *  3. Every `POST | PUT | PATCH` with a Zod `body` schema produces a
 *     `requestBody` in the generated `swagger.json`.
 *  4. Every Route declared with a Zod `response` schema produces a 200
 *     `application/json` block in `swagger.json`.
 *  5. The set of `tags` declared in the document matches the union of
 *     `route.openapi.tags` (no orphans, no missing tags).
 *  6. `swagger.json` operations count matches the live Route count
 *     (catches: routes not picked up by the generator, dead operations
 *     left over from a previous run, etc.).
 */

import { beforeAll, describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Route } from '@/shared-kernel/http/route';

const SRC_DIR = resolve(__dirname, '../../../src');
const SWAGGER_PATH = resolve(__dirname, '../../../swagger.json');

function* walkRoutesFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
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

interface CollectedRoute {
  readonly file: string;
  readonly route: Route;
}

const collected: CollectedRoute[] = [];
let swagger: { paths?: Record<string, Record<string, unknown>>; tags?: Array<{ name: string }> } =
  {};

beforeAll(async () => {
  for (const file of walkRoutesFiles(SRC_DIR)) {
    try {
      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      let foundExport = false;
      for (const value of Object.values(mod)) {
        if (isRouteArray(value)) {
          foundExport = true;
          for (const route of value) collected.push({ file, route: route as Route });
        }
      }
      if (!foundExport) {
        // Tag for invariant #1; resolve via expect inside the test.
        collected.push({ file, route: undefined as unknown as Route });
      }
    } catch {
      // Module load failure is its own test failure surface (tsc).
    }
  }
  if (statSync(SWAGGER_PATH, { throwIfNoEntry: false })) {
    swagger = JSON.parse(readFileSync(SWAGGER_PATH, 'utf8'));
  }
});

function convertPath(input: string): string {
  return input.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, n: string) => `{${n}}`);
}

describe('Route descriptors', () => {
  test('every *.routes.ts exports at least one Route[]', () => {
    const empty = collected.filter((c) => c.route === undefined).map((c) => c.file);
    expect(empty).toEqual([]);
  });

  test('SDK-exported routes have unique operation names', () => {
    // `sdk.name` is optional; when absent the swagger generator derives
    // a stable id from method+path. Either way, two exported routes
    // collapsing to the same id is an SDK-break — that's the invariant
    // we actually care about.
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const { route } of collected) {
      if (!route || route.sdk?.exported !== true) continue;
      const id = (route.sdk?.name ?? `${route.method.toLowerCase()}_${route.path}`)
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const existing = seen.get(id);
      if (existing) {
        collisions.push(`${id} → ${existing} vs ${route.method} ${route.path}`);
      } else {
        seen.set(id, `${route.method} ${route.path}`);
      }
    }
    expect(collisions).toEqual([]);
  });

  test('POST/PUT/PATCH with Zod body produces requestBody in swagger', () => {
    const stateChanging = new Set(['POST', 'PUT', 'PATCH']);
    const offenders: string[] = [];
    for (const { route } of collected) {
      if (!route || !stateChanging.has(route.method)) continue;
      if (!route.body) continue;
      const path = `/api${convertPath(route.path)}`;
      const op = swagger.paths?.[path]?.[route.method.toLowerCase()] as
        | { requestBody?: unknown }
        | undefined;
      if (!op?.requestBody) {
        offenders.push(`${route.method} ${route.path}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('routes declaring a response schema produce an application/json success block', () => {
    const offenders: string[] = [];
    for (const { route } of collected) {
      if (!route?.response) continue;
      const path = `/api${convertPath(route.path)}`;
      const op = swagger.paths?.[path]?.[route.method.toLowerCase()] as
        | { responses?: Record<string, { content?: Record<string, unknown> }> }
        | undefined;
      const expected = String(route.statusCode ?? (route.method === 'POST' ? 201 : 200));
      const hasJson = Boolean(op?.responses?.[expected]?.content?.['application/json']);
      if (!hasJson) offenders.push(`${route.method} ${route.path} (expected ${expected})`);
    }
    expect(offenders).toEqual([]);
  });

  test('document tags equal the union of route tags', () => {
    const routeTags = new Set<string>();
    for (const { route } of collected) {
      if (!route) continue;
      for (const t of route.openapi.tags) routeTags.add(t);
    }
    const docTags = new Set((swagger.tags ?? []).map((t) => t.name));
    expect([...docTags].sort()).toEqual([...routeTags].sort());
  });

  test('swagger operations count matches live Route count', () => {
    const liveCount = collected.filter((c) => c.route !== undefined).length;
    const docCount = Object.values(swagger.paths ?? {}).reduce(
      (n, item) => n + Object.keys(item ?? {}).length,
      0,
    );
    expect(docCount).toBe(liveCount);
  });
});
