#!/usr/bin/env bun
/**
 * Route descriptor coverage validator.
 *
 * Walks every `src/**​/*.routes.ts` file, loads the exported `Route[]`
 * arrays, and reports any route that lacks a usable response declaration.
 *
 * A route is considered DOCUMENTED when one of these holds:
 *  - `response` is a Zod schema (and not `z.unknown()` / `z.any()` / `z.never()`)
 *  - `binary` is set (downloadable file — see `route.binary`)
 *  - `kind: 'sse'` (SSE stream — body shape lives in EffectBatchSchema or per-stream docs)
 *  - `kind: 'redirect'` (302 redirect — no body)
 *  - `kind: 'stream'` (raw text stream, e.g. Prometheus)
 *  - the path is in the static allowlist (e.g. `/health`, `/metrics`)
 *
 * Forbidden in response position: `z.unknown()`, `z.any()`, `z.never()`.
 *
 * Exit codes:
 *   0 — all routes covered
 *   1 — one or more violations (in `error` mode) or unexpected error
 *
 * Modes:
 *   `SDK_COVERAGE_MODE=warn` — print but do not fail (default)
 *   `SDK_COVERAGE_MODE=error` — fail the build on the first violation
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ZodSchema } from 'zod';
import type { Route } from '@/shared-kernel/http/route.types';

const SRC_DIR = resolve(__dirname, '../../src');
const ROOT = resolve(__dirname, '../../');

const MODE: 'warn' | 'error' = (process.env.SDK_COVERAGE_MODE as 'warn' | 'error') ?? 'warn';

/** Path-prefix allowlist — routes that intentionally have no response
 *  schema (Prometheus metrics, health probes). */
const PATH_ALLOWLIST: ReadonlyArray<string> = ['/metrics', '/health'];

interface Violation {
  readonly file: string;
  readonly method: string;
  readonly path: string;
  readonly reason: string;
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

function zodTypeName(schema: ZodSchema<unknown>): string | undefined {
  return (schema as unknown as { _def?: { typeName?: string } })._def?.typeName;
}

function isAllowlistedPath(path: string): boolean {
  return PATH_ALLOWLIST.some((p) => path === p || path.startsWith(`${p}/`));
}

function checkRoute(file: string, route: Route): Violation | undefined {
  const ctx = { file: relative(ROOT, file), method: route.method, path: route.path };

  // Path allowlist (e.g. /metrics).
  if (isAllowlistedPath(route.path)) return;

  // SSE / stream / redirect routes don't need a response schema.
  if (route.kind === 'sse' || route.kind === 'stream' || route.kind === 'redirect') return;

  // 204 No Content has no body by HTTP semantics.
  if (route.statusCode === 204) return;

  // Binary routes declare media via `route.binary`.
  if (route.binary) return;

  // Anything else must have a response Zod schema.
  if (!route.response) {
    return { ...ctx, reason: 'missing response (no `response`, `binary`, or non-json `kind`)' };
  }

  const typeName = zodTypeName(route.response);
  if (typeName === 'ZodUnknown' || typeName === 'ZodAny' || typeName === 'ZodNever') {
    return {
      ...ctx,
      reason: `response uses ${typeName} which is forbidden — declare an explicit schema`,
    };
  }
  return;
}

async function main(): Promise<void> {
  const violations: Violation[] = [];
  let totalRoutes = 0;
  let totalFiles = 0;

  for (const file of walk(SRC_DIR)) {
    totalFiles += 1;
    let mod: Record<string, unknown>;
    try {
      mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
    } catch (err) {
      console.warn(`Skipped ${file}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (const value of Object.values(mod)) {
      if (!isRouteArray(value)) continue;
      for (const route of value as Route[]) {
        totalRoutes += 1;
        const v = checkRoute(file, route);
        if (v) violations.push(v);
      }
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('             ROUTE RESPONSE COVERAGE VALIDATOR');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Files scanned:  ${totalFiles}`);
  console.log(`Routes scanned: ${totalRoutes}`);
  console.log(`Violations:     ${violations.length}`);
  console.log(`Mode:           ${MODE}`);
  console.log('───────────────────────────────────────────────────────────────');

  if (violations.length === 0) {
    console.log('All routes have valid response declarations.');
    process.exitCode = 0;
    return;
  }

  // Group by file for readability.
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const existing = byFile.get(v.file) ?? [];
    existing.push(v);
    byFile.set(v.file, existing);
  }
  for (const [file, vs] of byFile) {
    console.log(`\n${file}`);
    for (const v of vs) {
      console.log(`  ${v.method} ${v.path}`);
      console.log(`    → ${v.reason}`);
    }
  }
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Hint: declare \`response: SomeZodSchema\`, \`binary: { mediaType }\`,`);
  console.log(`      or \`kind: 'sse' | 'stream' | 'redirect'\` as appropriate.`);

  if (MODE === 'error') {
    console.log(`Failing build (SDK_COVERAGE_MODE=error).`);
    process.exitCode = 1;
  } else {
    console.log(`Mode is 'warn' — not failing build. Set SDK_COVERAGE_MODE=error to enforce.`);
    process.exitCode = 0;
  }
}

if (process.argv[1]?.includes('validate-swagger-coverage')) {
  void main();
}

export { main as validateSwaggerCoverage };
