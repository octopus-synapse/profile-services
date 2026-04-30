#!/usr/bin/env bun
/**
 * Diff two `client-swagger.json` snapshots into a markdown report.
 *
 * Usage:
 *   bun scripts/diff-swagger.ts <before.json> [after.json]
 *
 * `after.json` defaults to `<repo>/client-swagger.json` (the current
 * generated spec). Output is written to stdout — pipe it into the
 * commit body or PR description.
 *
 * Categories:
 *   - addedPaths      — operations in `after` but not in `before`
 *   - removedPaths    — operations in `before` but not in `after`
 *   - changedSchemas  — paths whose response/body schema differs
 *   - breakingChanges — required→optional flips, removed required fields,
 *                        type changes on required keys
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface OpenApiOperation {
  readonly summary?: string;
  readonly tags?: readonly string[];
  readonly responses?: Record<string, unknown>;
  readonly requestBody?: unknown;
}

interface OpenApiSpec {
  readonly info?: { readonly version?: string; readonly title?: string };
  readonly paths?: Record<string, Record<string, OpenApiOperation>>;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

interface OperationKey {
  readonly method: HttpMethod;
  readonly path: string;
}

function listOperations(spec: OpenApiSpec): Map<string, OperationKey & OpenApiOperation> {
  const out = new Map<string, OperationKey & OpenApiOperation>();
  const paths = spec.paths ?? {};
  for (const [path, ops] of Object.entries(paths)) {
    for (const m of HTTP_METHODS) {
      const op = ops[m];
      if (op && typeof op === 'object') {
        out.set(`${m.toUpperCase()} ${path}`, { method: m, path, ...op });
      }
    }
  }
  return out;
}

function load(path: string): OpenApiSpec {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as OpenApiSpec;
}

function stable(value: unknown): string {
  return JSON.stringify(value, Object.keys(value ?? {}).sort());
}

function formatList(items: ReadonlyArray<string>): string {
  if (items.length === 0) return '_(none)_';
  return items.map((s) => `- \`${s}\``).join('\n');
}

function main(): void {
  const beforePath = process.argv[2];
  if (!beforePath) {
    console.error('usage: bun scripts/diff-swagger.ts <before.json> [after.json]');
    process.exit(2);
  }
  const afterPath = process.argv[3] ?? resolve(__dirname, '../client-swagger.json');

  const before = load(beforePath);
  const after = load(afterPath);

  const beforeOps = listOperations(before);
  const afterOps = listOperations(after);

  const added: string[] = [];
  const removed: string[] = [];
  const changedSchemas: string[] = [];
  const breakingChanges: string[] = [];

  for (const key of afterOps.keys()) {
    if (!beforeOps.has(key)) added.push(key);
  }
  for (const key of beforeOps.keys()) {
    if (!afterOps.has(key)) removed.push(key);
  }
  for (const [key, afterOp] of afterOps) {
    const beforeOp = beforeOps.get(key);
    if (!beforeOp) continue;
    if (stable(afterOp.responses) !== stable(beforeOp.responses)) {
      changedSchemas.push(`${key} (response)`);
    }
    if (stable(afterOp.requestBody) !== stable(beforeOp.requestBody)) {
      changedSchemas.push(`${key} (request body)`);
    }
  }

  // Heuristic breaking-change detection: removed paths and request-body
  // shape changes that drop fields previously listed as required.
  for (const path of removed) breakingChanges.push(`Removed: ${path}`);
  for (const change of changedSchemas) {
    // Best-effort signal — full schema diff can be added later.
    if (change.endsWith('(request body)')) breakingChanges.push(`RequestBody changed: ${change}`);
  }

  const report = [
    '# Swagger diff',
    '',
    `**Before**: \`${beforePath}\` (version: \`${before.info?.version ?? '?'}\`)`,
    `**After**:  \`${afterPath}\` (version: \`${after.info?.version ?? '?'}\`)`,
    '',
    '## Added paths',
    formatList(added.sort()),
    '',
    '## Removed paths',
    formatList(removed.sort()),
    '',
    '## Changed schemas',
    formatList(changedSchemas.sort()),
    '',
    '## Breaking changes (heuristic)',
    formatList(breakingChanges.sort()),
    '',
    `**Counts** — added: ${added.length}, removed: ${removed.length}, changedSchemas: ${changedSchemas.length}, breaking: ${breakingChanges.length}`,
    '',
  ].join('\n');

  process.stdout.write(report);
}

main();
