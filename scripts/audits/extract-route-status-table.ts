#!/usr/bin/env bun
/**
 * F1.1 — Extrai tabela (method, path, expectedStatus, statusSource)
 * de todos os *.routes.ts em src/.
 *
 * Regras:
 *   - statusCode declarado explicitamente → usa ele.
 *   - POST sem statusCode → 201 (Q17 auto-201).
 *   - DELETE/PATCH/PUT/GET sem statusCode → 200.
 *
 * Output JSON: [{ method, path, expectedStatus, statusSource, file }]
 * em scripts/audits/route-status-table.json.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Glob } from 'bun';

const SRC_DIR = resolve('src');
const OUTPUT = resolve('scripts/audits/route-status-table.json');

type StatusSource = 'explicit' | 'auto-201-post' | 'default-200';

interface RouteEntry {
  method: string;
  path: string;
  expectedStatus: number;
  statusSource: StatusSource;
  file: string;
}

/**
 * Find balanced object literal blocks introduced by a `method:` line.
 * Strategy: scan the file character-by-character maintaining depth of
 * braces and quotes. When we see `\n  {\n` at indent level of the
 * route array, that's the start of an entry; collect until the
 * matching `}`.
 */
function extractRouteBlocks(src: string): string[] {
  const blocks: string[] = [];
  // Cheaper heuristic: split the source on lines that begin a route
  // entry. A route entry always starts with a line ending in `{` and
  // the immediately following non-blank line is `method: '...'`. We
  // capture from each such anchor until either the next anchor or
  // EOF, then re-balance braces inside.
  const lines = src.split('\n');
  let current: string[] = [];
  let inside = false;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] ?? '';
    const startsRoute = !inside && /^\s*\{\s*$/.test(line) && /^\s*method:\s*['"]/.test(next);

    if (startsRoute) {
      inside = true;
      current = [];
      depth = 1; // we just entered with `{`
      current.push(line);
      continue;
    }

    if (inside) {
      current.push(line);
      // count braces ignoring those in strings/regex (heuristic: strip
      // string-literal contents before counting)
      const stripped = line.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
      for (const ch of stripped) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth === 0) {
        blocks.push(current.join('\n'));
        inside = false;
      }
    }
  }
  return blocks;
}

function parseRouteBlock(block: string, file: string): RouteEntry | null {
  const methodMatch = block.match(/method:\s*['"](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"]/);
  const pathMatch = block.match(/path:\s*['"]([^'"]+)['"]/);
  const statusMatch = block.match(/statusCode:\s*(\d+)/);

  if (!methodMatch || !pathMatch) return null;

  const method = methodMatch[1];
  const path = pathMatch[1];

  let expectedStatus: number;
  let statusSource: StatusSource;
  if (statusMatch) {
    expectedStatus = parseInt(statusMatch[1], 10);
    statusSource = 'explicit';
  } else if (method === 'POST') {
    expectedStatus = 201;
    statusSource = 'auto-201-post';
  } else {
    expectedStatus = 200;
    statusSource = 'default-200';
  }

  return {
    method,
    path,
    expectedStatus,
    statusSource,
    file: file.replace(`${process.cwd()}/`, ''),
  };
}

async function main(): Promise<void> {
  const entries: RouteEntry[] = [];

  for await (const rel of new Glob('**/*.routes.ts').scan({ cwd: SRC_DIR })) {
    if (rel.endsWith('.spec.ts')) continue;
    if (rel.includes('.routes.schemas')) continue;
    const abs = resolve(SRC_DIR, rel);
    const src = await Bun.file(abs).text();
    const blocks = extractRouteBlocks(src);
    for (const block of blocks) {
      const entry = parseRouteBlock(block, abs);
      if (entry) entries.push(entry);
    }
  }

  // Stable sort: by path then method.
  entries.sort((a, b) =>
    a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
  );

  writeFileSync(OUTPUT, JSON.stringify(entries, null, 2));

  // Sanity summary.
  const byStatus = new Map<number, number>();
  const bySource = new Map<StatusSource, number>();
  for (const e of entries) {
    byStatus.set(e.expectedStatus, (byStatus.get(e.expectedStatus) ?? 0) + 1);
    bySource.set(e.statusSource, (bySource.get(e.statusSource) ?? 0) + 1);
  }

  console.log(`[extract-route-status-table] ${entries.length} routes extracted`);
  console.log('  by status:');
  for (const [s, n] of Array.from(byStatus.entries()).sort()) {
    console.log(`    ${s}: ${n}`);
  }
  console.log('  by source:');
  for (const [s, n] of bySource) console.log(`    ${s}: ${n}`);
  console.log(`  written to ${OUTPUT.replace(`${process.cwd()}/`, '')}`);
}

void main();
