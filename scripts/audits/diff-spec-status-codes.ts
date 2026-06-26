#!/usr/bin/env bun
/**
 * F1.2 — Confronta asserts `expect(<resp>.status).toBe(<N>)` em
 * test/infrastructure/integration/**.spec.ts com a tabela de status
 * gerada pelo extract-route-status-table.ts.
 *
 * Estratégia:
 *   1. Carregar route-status-table.json e indexar por (method, pattern).
 *      Path-pattern do route já vem com `:param` (Elysia format).
 *   2. Para cada spec, varrer linha a linha. Quando encontrar um
 *      bloco que faz `.METHOD('/api/v1/...')` (supertest style),
 *      gravar (varName, method, path) num "in-flight" map keyed by
 *      varName (`res`, `response`, `loginRes`, etc).
 *   3. Quando encontrar `expect(<varName>.status).toBe(<N>)`, lookup
 *      o último (method, path) para esse varName e comparar com a
 *      tabela.
 *
 * Output: markdown table de mismatches em scripts/audits/status-code-diff.md.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Glob } from 'bun';

interface RouteEntry {
  method: string;
  path: string;
  expectedStatus: number;
  statusSource: string;
  file: string;
}

interface Mismatch {
  specFile: string;
  specLine: number;
  varName: string;
  callMethod: string;
  callPath: string;
  matchedRoute: RouteEntry | null;
  currentAssert: number;
  expected: number;
  note: string;
}

const TABLE_PATH = resolve('scripts/audits/route-status-table.json');
const SPECS_DIR = resolve('test/infrastructure/integration');
const REPORT_PATH = resolve('scripts/audits/status-code-diff.md');

const routes: RouteEntry[] = JSON.parse(readFileSync(TABLE_PATH, 'utf8'));

/** Converts route pattern `/v1/resumes/:id` to regex tester. */
function routeToTester(routePath: string): RegExp {
  const escaped = routePath
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/:[A-Za-z_][\w]*/g, '[^/]+');
  return new RegExp(`^${escaped}/?$`);
}

const routeTesters = routes.map((r) => ({
  route: r,
  tester: routeToTester(r.path),
}));

/**
 * Strip /api prefix and querystring from a request path so it can
 * be matched against route table entries.
 */
function normalizeRequestPath(raw: string): string {
  let p = raw.trim();
  // strip template-literal interpolation markers ${...} → :param
  p = p.replace(/\$\{[^}]+\}/g, ':param');
  // strip query
  const q = p.indexOf('?');
  if (q >= 0) p = p.slice(0, q);
  // strip /api prefix
  if (p.startsWith('/api/')) p = p.slice(4);
  // collapse trailing slash
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function findRoute(method: string, requestPath: string): RouteEntry | null {
  const norm = normalizeRequestPath(requestPath);
  for (const { route, tester } of routeTesters) {
    if (route.method !== method) continue;
    if (tester.test(norm)) return route;
  }
  return null;
}

/**
 * Detect calls like `.post('/v1/...')`, `.get('/v1/...')`, etc.
 * Returns null if no call detected.
 */
function detectCall(line: string): { method: string; path: string } | null {
  const m = line.match(/\.(get|post|put|patch|delete|head|options)\(\s*[`'"]([^`'"]+)[`'"]/i);
  if (!m) return null;
  return { method: m[1].toUpperCase(), path: m[2] };
}

/**
 * Detect lines like `const <var> = await getRequest()...` or
 * `const <var> = await supertest()...` — captures the var name and
 * we'll associate the next `.METHOD(path)` call to it.
 *
 * Also handles `<varName> = await getRequest()...` (reassignment).
 */
function detectAssignment(line: string): string | null {
  const m = line.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?getRequest/);
  if (m) return m[1];
  const m2 = line.match(/^[\s]*([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?getRequest/);
  if (m2) return m2[1];
  return null;
}

function detectExpect(line: string): { varName: string; status: number } | null {
  const m = line.match(/expect\(\s*([A-Za-z_$][\w$]*)\.status\s*\)\.toBe\(\s*(\d+)\s*\)/);
  if (!m) return null;
  return { varName: m[1], status: parseInt(m[2], 10) };
}

interface InFlight {
  method: string;
  path: string;
  line: number;
}

function analyzeSpec(file: string): Mismatch[] {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const mismatches: Mismatch[] = [];
  const inflight = new Map<string, InFlight>();
  let currentVar: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineno = i + 1;

    // Assignment? Remember the var name for the upcoming call.
    const assigned = detectAssignment(line);
    if (assigned) currentVar = assigned;

    // Call?
    const call = detectCall(line);
    if (call && currentVar) {
      inflight.set(currentVar, { method: call.method, path: call.path, line: lineno });
      currentVar = null; // consumed
    } else if (call && !currentVar) {
      // Anonymous call or call on a var we already track on a single
      // line: try to detect from the same line.
      const inline = line.match(
        /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?[^.]+\.(?:get|post|put|patch|delete)/,
      );
      if (inline) {
        inflight.set(inline[1], { method: call.method, path: call.path, line: lineno });
      }
    }

    // Expect?
    const expectMatch = detectExpect(line);
    if (expectMatch) {
      const fl = inflight.get(expectMatch.varName);
      if (!fl) continue;
      const route = findRoute(fl.method, fl.path);
      const expected = route ? route.expectedStatus : null;

      // Some asserts are intentional non-2xx (401, 403, 404, 400, 429,
      // 423, 500). Skip those — only flag where the spec asserts a 2xx
      // that conflicts with route table.
      const isSuccessAssert = expectMatch.status >= 200 && expectMatch.status < 300;
      if (!isSuccessAssert) continue;

      if (route === null) {
        // Couldn't match the route — skip silently (not all calls
        // map; e.g. external API URLs in some specs).
        continue;
      }

      if (expectMatch.status !== expected) {
        mismatches.push({
          specFile: file.replace(`${process.cwd()}/`, ''),
          specLine: lineno,
          varName: expectMatch.varName,
          callMethod: fl.method,
          callPath: fl.path,
          matchedRoute: route,
          currentAssert: expectMatch.status,
          expected: expected!,
          note: route.statusSource,
        });
      }
    }
  }
  return mismatches;
}

async function main(): Promise<void> {
  const all: Mismatch[] = [];
  for await (const rel of new Glob('**/*.spec.ts').scan({ cwd: SPECS_DIR })) {
    const abs = resolve(SPECS_DIR, rel);
    const mm = analyzeSpec(abs);
    all.push(...mm);
  }

  // Build markdown report.
  const lines: string[] = [];
  lines.push('# Status code mismatches — sweep A diff');
  lines.push('');
  lines.push(`Total mismatches: **${all.length}**`);
  lines.push('');
  lines.push('Cada linha abaixo é um assert `expect(res.status).toBe(N)` cujo N');
  lines.push('não bate com a route table extraída de `*.routes.ts`.');
  lines.push('');
  lines.push('| Spec | Line | Method | Path | Current | Expected | Source |');
  lines.push('|---|---:|---|---|---:|---:|---|');
  for (const mm of all) {
    lines.push(
      `| \`${mm.specFile}\` | ${mm.specLine} | ${mm.callMethod} | \`${mm.callPath}\` | **${mm.currentAssert}** | **${mm.expected}** | ${mm.note} |`,
    );
  }

  // Group counts.
  const byPair = new Map<string, number>();
  for (const mm of all) {
    const k = `${mm.currentAssert} → ${mm.expected}`;
    byPair.set(k, (byPair.get(k) ?? 0) + 1);
  }
  lines.push('');
  lines.push('## Distribuição');
  lines.push('');
  lines.push('| De → Para | Quantidade |');
  lines.push('|---|---:|');
  for (const [k, n] of Array.from(byPair.entries()).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${n} |`);
  }

  writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`);
  console.log(`[diff-spec-status-codes] ${all.length} mismatches`);
  for (const [k, n] of byPair) console.log(`  ${k}: ${n}`);
  console.log(`  written to ${REPORT_PATH.replace(`${process.cwd()}/`, '')}`);

  // Also emit a JSON sibling for programmatic application.
  const jsonPath = REPORT_PATH.replace(/\.md$/, '.json');
  writeFileSync(jsonPath, JSON.stringify(all, null, 2));
}

void main();
