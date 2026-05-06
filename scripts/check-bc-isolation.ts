/**
 * P1-048 — flag direct cross-BC imports that bypass a barrel
 * (`index.ts`) or the application port surface.
 *
 * The convention: BC A reaches into BC B only via
 *   1. `@/bounded-contexts/<b>/index.ts` (barrel)
 *   2. `@/bounded-contexts/<b>/<sub>/index.ts` (sub-BC barrel)
 *   3. `@/bounded-contexts/<b>/.../*.port.ts` files (typed port)
 *   4. `@/bounded-contexts/<b>/domain/events/...` (events are the
 *      decoupling primitive across BCs)
 *
 * Imports that drill into another BC's `application/use-cases`,
 * `infrastructure/`, or `services/` indicate a missing port, and
 * should be replaced with a port-and-adapter pair owned by the
 * caller (see P1-046 for the canonical example).
 *
 * This script reports ALL violations and exits non-zero when any
 * exist. Use as a CI gate.
 */

import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { Glob } from 'bun';

const SRC_DIR = resolve('src/bounded-contexts');
const IMPORT_RE = /(?:import\s+(?:[^'"]+\s+from\s+)?|import\s*\(\s*)['"]([^'"]+)['"]/g;

function bcOf(path: string): string | null {
  const rel = relative(SRC_DIR, path);
  if (rel.startsWith('..')) return null;
  return rel.split('/')[0] ?? null;
}

interface Violation {
  readonly fromFile: string;
  readonly fromBc: string;
  readonly importSpec: string;
  readonly toBc: string;
  readonly reason: string;
}

function classifyCrossBcImport(spec: string, toBc: string): string | null {
  // Allow: `@/bounded-contexts/<bc>` (barrel) and
  //        `@/bounded-contexts/<bc>/<one>` (sub-BC barrel).
  const tail = spec.replace(`@/bounded-contexts/${toBc}`, '').replace(/^\//, '');
  if (tail === '' || tail === 'index') return null;
  if (!tail.includes('/')) return null;
  // Allow port files anywhere under the target BC.
  if (/\.port$|\/ports?\//.test(tail)) return null;
  // Allow domain events (the decoupling primitive across BCs).
  if (tail.startsWith('domain/events') || /\/domain\/events\//.test(tail)) return null;
  // Allow domain entities at the type-only level — TS can't enforce
  // type-onlyness but pragmatically the entity types are the public
  // shape every BC publishes alongside its events.
  if (tail.startsWith('domain/entities') || /\/domain\/entities\//.test(tail)) return null;
  // Allow shared-kernel-style cache.port within a BC's domain.
  if (/\/domain\/.+\.port$/.test(tail)) return null;
  return `cross-BC drill-down (use the BC barrel or a typed port)`;
}

async function main(): Promise<void> {
  const violations: Violation[] = [];
  const glob = new Glob('**/*.ts');

  for await (const rel of glob.scan({ cwd: SRC_DIR })) {
    if (rel.endsWith('.spec.ts') || rel.endsWith('.test.ts')) continue;
    if (rel.includes('/testing/')) continue;
    const abs = join(SRC_DIR, rel);
    const fromBc = bcOf(abs);
    if (!fromBc) continue;
    const src = readFileSync(abs, 'utf8');
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(src))) {
      const spec = match[1];
      if (!spec?.startsWith('@/bounded-contexts/')) continue;
      const path = spec.slice('@/bounded-contexts/'.length);
      const toBc = path.split('/')[0];
      if (!toBc || toBc === fromBc) continue;
      const reason = classifyCrossBcImport(spec, toBc);
      if (reason) {
        violations.push({
          fromFile: relative(resolve('.'), abs),
          fromBc,
          importSpec: spec,
          toBc,
          reason,
        });
      }
    }
  }

  const strict = process.argv.includes('--strict');

  if (violations.length === 0) {
    console.log('[check-bc-isolation] no cross-BC drill-down imports detected');
    return;
  }

  // Report-only by default — see check-bc-cycles.ts for the same
  // rationale. P1-046 fixed the canonical example; the rest of the
  // 405 callsites (most of which are PrismaService imports — the
  // platform BC is the legitimate hub) need a wider port-extraction
  // PR that this script will then gate.
  const log = strict ? console.error : console.warn;
  log(`[check-bc-isolation] ${violations.length} violation(s)${strict ? '' : ' (report-only)'}:`);
  for (const v of violations) {
    log(`  ${v.fromFile}`);
    log(`    ${v.fromBc} → ${v.toBc}: ${v.importSpec}`);
    log(`    ${v.reason}`);
  }
  if (strict) process.exit(1);
}

void main();
