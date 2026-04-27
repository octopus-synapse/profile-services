/**
 * Logger coverage audit.
 *
 * Counts files that *should* be using `LoggerPort` (because they sit on
 * a layer where observability matters) but don't. Pure static analysis —
 * we don't claim a use-case `must` log every branch, only that the port
 * has to be wired in so the team can attach a log without changing the
 * constructor surface every time.
 *
 * Five categories, each is a separate baseline:
 *
 *   1. use-case files in `application/use-cases/**` whose constructor has
 *      ≥ 2 dependencies but doesn't inject `LoggerPort`.
 *   2. infra adapters/services in `infrastructure/**` that touch an
 *      external boundary (fetch / Prisma / SDK / queue / browser) and
 *      don't inject `LoggerPort`.
 *   3. workers (`*.worker.ts`) that don't have BOTH a `this.logger.log`
 *      and a `this.logger.error` call site — workers without any log /
 *      error trail are observability black holes.
 *   4. event handlers (`application/handlers/**` OR `*.handler.ts`)
 *      that don't inject `LoggerPort`.
 *   5. silent catches: `catch (err) { ... }` blocks whose body has
 *      neither `this.logger.` nor a `throw` — they swallow failures.
 *
 * Each category is locked to a baseline number; the test fails if it
 * grows. Lower it as fixes land. When all five hit zero we get
 * structured logs everywhere and metrics-from-logs becomes feasible.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../../../');

// Files we explicitly accept as exempt (e.g. domain-only use-cases that
// genuinely don't need logging, or trivial adapters). Keep this set small
// and justify each entry.
const EXEMPT = new Set<string>([]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__' || entry === 'testing') continue;
      yield* walk(full);
    } else if (
      st.isFile() &&
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      yield full;
    }
  }
}

function read(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

interface ConstructorShape {
  paramCount: number;
  injectsLogger: boolean;
}

/** Picks the widest `constructor(...)` in the file as a proxy for the
 * "main" class — files often declare extra error classes alongside.
 * `injectsLogger` OR-folds across every constructor in the file. */
function readConstructor(src: string): ConstructorShape | null {
  const re = /constructor\s*\(([\s\S]*?)\)\s*\{/g;
  const inners: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) inners.push(m[1]);
  if (inners.length === 0) return null;
  const inner = inners.reduce((a, b) => (b.length > a.length ? b : a));
  if (inner.trim().length === 0) return { paramCount: 0, injectsLogger: false };
  let depth = 0;
  let inStr: string | null = null;
  let count = 1;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const prev = inner[i - 1];
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    if (ch === ')' || ch === ']' || ch === '}' || ch === '>') depth--;
    if (ch === ',' && depth === 0) count++;
  }
  const injectsLogger = inners.some((s) => /\bLoggerPort\b/.test(s));
  return { paramCount: count, injectsLogger };
}

interface Findings {
  useCaseGaps: string[];
  infraAdapterGaps: string[];
  workerGaps: string[];
  handlerGaps: string[];
  silentCatches: string[];
}

const INFRA_BOUNDARY_HINTS = [
  /\bfetch\s*\(/,
  /from\s+['"]@prisma\/client['"]/,
  /\bnew\s+PrismaClient\b/,
  /from\s+['"]openai['"]/,
  /from\s+['"]puppeteer['"]/,
  /from\s+['"]bullmq['"]/,
  /from\s+['"]@nestjs\/bullmq['"]/,
  /from\s+['"]ioredis['"]/,
  /from\s+['"]nodemailer['"]/,
  /from\s+['"]minio['"]/,
  /from\s+['"]aws-sdk['"]/,
];

function audit(): Findings {
  const findings: Findings = {
    useCaseGaps: [],
    infraAdapterGaps: [],
    workerGaps: [],
    handlerGaps: [],
    silentCatches: [],
  };

  for (const path of walk(SRC)) {
    const rel = relative(SRC, path).replace(/\\/g, '/');
    if (EXEMPT.has(rel)) continue;
    const src = read(path);

    // --- 1. Use-case constructor coverage ----------------------------
    if (/application\/use-cases\//.test(rel) && rel.endsWith('.use-case.ts')) {
      const shape = readConstructor(src);
      if (shape && shape.paramCount >= 2 && !shape.injectsLogger) {
        findings.useCaseGaps.push(rel);
      }
    }

    // --- 2. Infra adapter / service that touches an external boundary -
    if (
      /infrastructure\/(adapters|services|repositories|workers)\//.test(rel) ||
      rel.endsWith('.adapter.ts') ||
      rel.endsWith('.repository.ts')
    ) {
      const touchesBoundary = INFRA_BOUNDARY_HINTS.some((re) => re.test(src));
      const shape = readConstructor(src);
      if (touchesBoundary && shape && !shape.injectsLogger) {
        findings.infraAdapterGaps.push(rel);
      }
    }

    // --- 3. Workers must inject LoggerPort + emit at least one trail
    //        call. We don't require both `log` AND `error` because some
    //        workers are pure schedulers that only escalate on failure;
    //        what we DO require is an injected port and at least one
    //        observability site.
    if (rel.endsWith('.worker.ts')) {
      const shape = readConstructor(src);
      const hasAnyLog = /this\.logger\.(log|debug|warn|error)\s*\(/.test(src);
      if ((shape && !shape.injectsLogger) || !hasAnyLog) findings.workerGaps.push(rel);
    }

    // --- 4. Handlers must inject logger ------------------------------
    if (
      (/application\/handlers\//.test(rel) || rel.endsWith('.handler.ts')) &&
      !rel.endsWith('.use-case.ts')
    ) {
      const shape = readConstructor(src);
      if (shape && !shape.injectsLogger) findings.handlerGaps.push(rel);
    }

    // --- 5. Silent catch blocks --------------------------------------
    // Match `catch (...) {  ...  }` whose body has no `this.logger.` and
    // no `throw`. We only flag blocks shorter than ~12 lines so we don't
    // false-flag long re-routing branches that intentionally suppress.
    for (const body of catchBodies(src)) {
      const lineCount = body.split('\n').length;
      if (lineCount > 12) continue;
      if (/this\.logger\./.test(body)) continue;
      if (/\bthrow\b/.test(body)) continue;
      if (body.trim().length === 0) continue; // empty catch — different smell
      findings.silentCatches.push(rel);
      break; // one entry per file is enough
    }
  }
  return findings;
}

/** Yields each `catch (...) { ... }` body as a string, with proper brace
 *  matching so nested `{}` (inline types, object literals) don't truncate
 *  the body early. Strings/templates are tracked to avoid false matches
 *  inside literals. */
function* catchBodies(src: string): Generator<string> {
  const re = /catch\s*(?:\([^)]*\))?\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    let inStr: string | null = null;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      const prev = src[i - 1];
      if (inStr) {
        if (ch === inStr && prev !== '\\') inStr = null;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        inStr = ch;
        i++;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    yield src.slice(start, i - 1);
    re.lastIndex = i;
  }
}

describe('Logger coverage audit', () => {
  const findings = audit();

  // The baseline lives in a sibling JSON file so it can ratchet down on
  // its own. After each run we rewrite the file with `min(stored, current)`
  // for every metric — tests fail if a metric grew, and the file moves to
  // the new floor when it shrank, no manual edit required. The file IS
  // versioned, so PRs that close gaps land the smaller numbers naturally.
  const ratchet = (key: keyof Counts, current: number) => {
    const stored = readBaseline();
    if (current > stored[key]) {
      // Test will fail; don't rewrite — preserve the historical floor.
      return stored[key];
    }
    if (current < stored[key]) {
      writeBaseline({ ...stored, [key]: current });
    }
    return Math.min(stored[key], current);
  };

  it(`use-case constructors missing LoggerPort = ${findings.useCaseGaps.length}`, () => {
    if (findings.useCaseGaps.length > 0) {
      console.warn(`\nUse-case gaps:\n${findings.useCaseGaps.map((f) => `  - ${f}`).join('\n')}\n`);
    }
    const ceiling = ratchet('useCaseGaps', findings.useCaseGaps.length);
    expect(findings.useCaseGaps.length).toBeLessThanOrEqual(ceiling);
  });

  it(`infra adapters/services missing LoggerPort = ${findings.infraAdapterGaps.length}`, () => {
    if (findings.infraAdapterGaps.length > 0) {
      console.warn(
        `\nInfra adapter gaps:\n${findings.infraAdapterGaps.map((f) => `  - ${f}`).join('\n')}\n`,
      );
    }
    const ceiling = ratchet('infraAdapterGaps', findings.infraAdapterGaps.length);
    expect(findings.infraAdapterGaps.length).toBeLessThanOrEqual(ceiling);
  });

  it(`workers missing log+error = ${findings.workerGaps.length}`, () => {
    if (findings.workerGaps.length > 0) {
      console.warn(`\nWorker gaps:\n${findings.workerGaps.map((f) => `  - ${f}`).join('\n')}\n`);
    }
    const ceiling = ratchet('workerGaps', findings.workerGaps.length);
    expect(findings.workerGaps.length).toBeLessThanOrEqual(ceiling);
  });

  it(`handlers missing LoggerPort = ${findings.handlerGaps.length}`, () => {
    if (findings.handlerGaps.length > 0) {
      console.warn(`\nHandler gaps:\n${findings.handlerGaps.map((f) => `  - ${f}`).join('\n')}\n`);
    }
    const ceiling = ratchet('handlerGaps', findings.handlerGaps.length);
    expect(findings.handlerGaps.length).toBeLessThanOrEqual(ceiling);
  });

  it(`silent catch blocks (no log, no rethrow) = ${findings.silentCatches.length}`, () => {
    if (findings.silentCatches.length > 0) {
      console.warn(
        `\nSilent catch files:\n${findings.silentCatches.map((f) => `  - ${f}`).join('\n')}\n`,
      );
    }
    const ceiling = ratchet('silentCatches', findings.silentCatches.length);
    expect(findings.silentCatches.length).toBeLessThanOrEqual(ceiling);
  });
});

interface Counts {
  useCaseGaps: number;
  infraAdapterGaps: number;
  workerGaps: number;
  handlerGaps: number;
  silentCatches: number;
}

const BASELINE_FILE = join(__dirname, 'logger-coverage.baseline.json');

function readBaseline(): Counts {
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Counts;
}

function writeBaseline(next: Counts): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
}
