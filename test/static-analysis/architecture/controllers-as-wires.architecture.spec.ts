/**
 * Controllers-as-wires architecture audit
 *
 * The controllers are supposed to be a thin HTTP adapter:
 *   - call a use-case POJO,
 *   - hand the result to a presenter,
 *   - let the global `DomainExceptionFilter` translate domain errors.
 *
 * Anything else — throwing Nest HTTP exceptions, catching domain errors
 * to convert them by hand, hitting Prisma directly, or mixing audit/event
 * publishing into the handler — couples the route to the framework and
 * spreads business logic across two layers.
 *
 * Scope: only audit controllers whose owning BC already has an
 * `application/use-cases/` tree. BCs still on the controller→service
 * pattern (skills-catalog, automation, dsl, etc.) are ignored here —
 * migrating them is a Fase C+1 decision, not within the current
 * "controllers as wires" remit.
 *
 * Detected smells (counted, ratchet-down):
 *   - NEST_EXCEPTION_THROW: `throw new <NestException>(` inside the file
 *   - MANUAL_ERROR_MAPPING: `} catch (...) {` followed by a `throw new
 *     <NestException>` in the same body, OR a private helper named
 *     `toHttpException` / `translate` / `mapError`
 *   - DIRECT_PRISMA: import of `PrismaService` in the controller
 *   - MULTI_RESPONSIBILITY (subset): `this.audit.` or `this.events.`
 *     called from a handler (these belong inside the use case)
 */

import { afterAll, describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'src';
const BC_ROOT = 'src/bounded-contexts';

const NEST_HTTP_EXCEPTIONS = [
  'BadRequestException',
  'UnauthorizedException',
  'PaymentRequiredException',
  'ForbiddenException',
  'NotFoundException',
  'MethodNotAllowedException',
  'NotAcceptableException',
  'RequestTimeoutException',
  'ConflictException',
  'GoneException',
  'LengthRequiredException',
  'PreconditionFailedException',
  'PayloadTooLargeException',
  'UnsupportedMediaTypeException',
  'UnprocessableEntityException',
  'InternalServerErrorException',
  'NotImplementedException',
  'BadGatewayException',
  'ServiceUnavailableException',
  'GatewayTimeoutException',
  'HttpException',
  'HttpVersionNotSupportedException',
  'PreconditionRequiredException',
  'TooManyRequestsException',
  'MisdirectedException',
  'ImATeapotException',
];

const NEST_THROW_RE = new RegExp(
  `throw\\s+new\\s+(${NEST_HTTP_EXCEPTIONS.join('|')})\\s*\\(`,
);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (
        entry === 'node_modules' ||
        entry === '__tests__' ||
        entry === 'testing' ||
        entry === '__mocks__'
      ) continue;
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

/** Collects every BC sub-tree that already has at least one
 *  `application/use-cases/` folder. A controller is in scope iff it lives
 *  underneath one of these roots. */
function collectUseCaseRoots(): string[] {
  const roots: string[] = [];
  for (const path of walk(BC_ROOT)) {
    const rel = relative('.', path).replace(/\\/g, '/');
    const idx = rel.indexOf('/application/use-cases/');
    if (idx === -1) continue;
    const root = rel.slice(0, idx); // e.g. src/bounded-contexts/resumes/core
    if (!roots.includes(root)) roots.push(root);
  }
  return roots;
}

interface Smells {
  NEST_EXCEPTION_THROW: number;
  MANUAL_ERROR_MAPPING: number;
  DIRECT_PRISMA: number;
  MULTI_RESPONSIBILITY: number;
}

const ZERO: Smells = {
  NEST_EXCEPTION_THROW: 0,
  MANUAL_ERROR_MAPPING: 0,
  DIRECT_PRISMA: 0,
  MULTI_RESPONSIBILITY: 0,
};

function analyse(src: string): Smells {
  const out: Smells = { ...ZERO };

  // NEST_EXCEPTION_THROW — count each `throw new <NestExc>(` occurrence.
  for (const m of src.matchAll(new RegExp(NEST_THROW_RE, 'g'))) void m, out.NEST_EXCEPTION_THROW++;

  // MANUAL_ERROR_MAPPING:
  //   (a) any catch body that contains `throw new <NestExc>(`
  //   (b) a private helper named toHttpException / translate / mapError
  //       (these are the patterns we already cleaned up in resume-styles
  //       + onboarding — they all delegated mapping to a private method)
  const catchRe = /catch\s*(?:\([^)]*\))?\s*\{/g;
  for (const m of src.matchAll(catchRe)) {
    const body = sliceBracedBody(src, m.index + m[0].length - 1);
    if (body && NEST_THROW_RE.test(body)) out.MANUAL_ERROR_MAPPING++;
  }
  if (
    /private\s+(?:readonly\s+)?(?:async\s+)?(?:toHttpException|translate|mapError)\s*\(/.test(src)
  ) {
    out.MANUAL_ERROR_MAPPING++;
  }

  // DIRECT_PRISMA — import of PrismaService in the file.
  if (
    /import\s*(?:type\s*)?\{[^}]*\bPrismaService\b[^}]*\}\s*from\s*['"]/.test(src) ||
    /from\s*['"]@prisma\/client['"]/.test(src)
  ) {
    out.DIRECT_PRISMA++;
  }

  // MULTI_RESPONSIBILITY — handler reaches into audit / events directly.
  for (const _m of src.matchAll(/\bthis\.audit\./g)) void _m, out.MULTI_RESPONSIBILITY++;
  for (const _m of src.matchAll(/\bthis\.events\./g)) void _m, out.MULTI_RESPONSIBILITY++;

  return out;
}

/** Walk braces from `openIdx` (the `{`) and return the body string up to
 *  the matching `}`, respecting nested braces and string literals. */
function sliceBracedBody(src: string, openIdx: number): string | null {
  if (src[openIdx] !== '{') return null;
  let depth = 0;
  let inStr: string | null = null;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    const prev = src[i - 1];
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return null;
}

interface PerFile {
  readonly file: string;
  readonly smells: Smells;
}

function audit(): { totals: Smells; perFile: PerFile[] } {
  const useCaseRoots = collectUseCaseRoots();
  const perFile: PerFile[] = [];
  const totals: Smells = { ...ZERO };

  for (const path of walk(SRC)) {
    if (!path.endsWith('.controller.ts')) continue;
    const rel = relative('.', path).replace(/\\/g, '/');
    const inScope = useCaseRoots.some((r) => rel.startsWith(`${r}/`));
    if (!inScope) continue;

    const src = readFileSync(path, 'utf8');
    const smells = analyse(src);
    const sum =
      smells.NEST_EXCEPTION_THROW +
      smells.MANUAL_ERROR_MAPPING +
      smells.DIRECT_PRISMA +
      smells.MULTI_RESPONSIBILITY;
    if (sum === 0) continue;

    perFile.push({ file: rel, smells });
    totals.NEST_EXCEPTION_THROW += smells.NEST_EXCEPTION_THROW;
    totals.MANUAL_ERROR_MAPPING += smells.MANUAL_ERROR_MAPPING;
    totals.DIRECT_PRISMA += smells.DIRECT_PRISMA;
    totals.MULTI_RESPONSIBILITY += smells.MULTI_RESPONSIBILITY;
  }

  return { totals, perFile: perFile.sort((a, b) => a.file.localeCompare(b.file)) };
}

const BASELINE_FILE = join(__dirname, 'controllers-as-wires.baseline.json');

interface Baseline {
  readonly NEST_EXCEPTION_THROW: number;
  readonly MANUAL_ERROR_MAPPING: number;
  readonly DIRECT_PRISMA: number;
  readonly MULTI_RESPONSIBILITY: number;
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

function writeBaseline(next: Baseline): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
}

describe('Controllers as wires', () => {
  const { totals, perFile } = audit();
  const stored = readBaseline();

  // Single atomic write at the end of the suite — each `it` only reads
  // `stored` and compares. Writing inside each `it` would be a race:
  // four tests load `stored` once, then each writes `{...stored, X: ...}`,
  // so the last write clobbers the others' ratchets.
  afterAll(() => {
    const next: Baseline = {
      NEST_EXCEPTION_THROW: Math.min(stored.NEST_EXCEPTION_THROW, totals.NEST_EXCEPTION_THROW),
      MANUAL_ERROR_MAPPING: Math.min(stored.MANUAL_ERROR_MAPPING, totals.MANUAL_ERROR_MAPPING),
      DIRECT_PRISMA: Math.min(stored.DIRECT_PRISMA, totals.DIRECT_PRISMA),
      MULTI_RESPONSIBILITY: Math.min(stored.MULTI_RESPONSIBILITY, totals.MULTI_RESPONSIBILITY),
    };
    if (
      next.NEST_EXCEPTION_THROW !== stored.NEST_EXCEPTION_THROW ||
      next.MANUAL_ERROR_MAPPING !== stored.MANUAL_ERROR_MAPPING ||
      next.DIRECT_PRISMA !== stored.DIRECT_PRISMA ||
      next.MULTI_RESPONSIBILITY !== stored.MULTI_RESPONSIBILITY
    ) {
      writeBaseline(next);
    }
  });

  it('NEST_EXCEPTION_THROW count only shrinks', () => {
    if (totals.NEST_EXCEPTION_THROW > 0 && perFile.length > 0) {
      console.warn(
        `\nNEST_EXCEPTION_THROW (${totals.NEST_EXCEPTION_THROW}):\n${perFile
          .filter((p) => p.smells.NEST_EXCEPTION_THROW > 0)
          .map((p) => `  - ${p.file}: ${p.smells.NEST_EXCEPTION_THROW}`)
          .join('\n')}\n`,
      );
    }
    expect(totals.NEST_EXCEPTION_THROW).toBeLessThanOrEqual(stored.NEST_EXCEPTION_THROW);
  });

  it('MANUAL_ERROR_MAPPING count only shrinks', () => {
    if (totals.MANUAL_ERROR_MAPPING > 0 && perFile.length > 0) {
      console.warn(
        `\nMANUAL_ERROR_MAPPING (${totals.MANUAL_ERROR_MAPPING}):\n${perFile
          .filter((p) => p.smells.MANUAL_ERROR_MAPPING > 0)
          .map((p) => `  - ${p.file}: ${p.smells.MANUAL_ERROR_MAPPING}`)
          .join('\n')}\n`,
      );
    }
    expect(totals.MANUAL_ERROR_MAPPING).toBeLessThanOrEqual(stored.MANUAL_ERROR_MAPPING);
  });

  it('DIRECT_PRISMA count only shrinks', () => {
    if (totals.DIRECT_PRISMA > 0 && perFile.length > 0) {
      console.warn(
        `\nDIRECT_PRISMA (${totals.DIRECT_PRISMA}):\n${perFile
          .filter((p) => p.smells.DIRECT_PRISMA > 0)
          .map((p) => `  - ${p.file}`)
          .join('\n')}\n`,
      );
    }
    expect(totals.DIRECT_PRISMA).toBeLessThanOrEqual(stored.DIRECT_PRISMA);
  });

  it('MULTI_RESPONSIBILITY count only shrinks', () => {
    if (totals.MULTI_RESPONSIBILITY > 0 && perFile.length > 0) {
      console.warn(
        `\nMULTI_RESPONSIBILITY (${totals.MULTI_RESPONSIBILITY}):\n${perFile
          .filter((p) => p.smells.MULTI_RESPONSIBILITY > 0)
          .map((p) => `  - ${p.file}: ${p.smells.MULTI_RESPONSIBILITY}`)
          .join('\n')}\n`,
      );
    }
    expect(totals.MULTI_RESPONSIBILITY).toBeLessThanOrEqual(stored.MULTI_RESPONSIBILITY);
  });
});
