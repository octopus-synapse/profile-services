/**
 * class-validator / class-transformer leakage audit
 *
 * The application/domain layers are framework-agnostic POJOs. Request
 * validation is the responsibility of the HTTP edge — and the project's
 * standard for that edge is Zod via `nestjs-zod` (`createZodDto`):
 *   - schemas are plain objects, reusable in workers/webhooks/tests
 *   - validation errors come back as `ZodError` and are translated into
 *     the domain `ValidationException` by the i18n pipe
 *   - OpenAPI is generated from the same schema (no double source of truth)
 *
 * `class-validator` decorators (`@IsString`, `@IsBoolean`, `@IsArray`, …)
 * and `class-transformer` decorators (`@Type`, `@Transform`, `@Expose`)
 * pull in `reflect-metadata` and tie validation to a class identity, which
 * makes the schemas useless outside Nest. This spec inventories every file
 * still using either, ratchets the count down on each fix, and fails when
 * the count grows.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'src';

// Decorator names that are unambiguous markers of class-validator /
// class-transformer use. We grep for the `@<name>(` form to avoid catching
// an identifier that happens to share the name (e.g. `IsString` as a
// helper function in some other package).
const FORBIDDEN_DECORATORS = [
  // class-validator (sample, common ones — extend if a new one shows up)
  'IsString',
  'IsBoolean',
  'IsNumber',
  'IsInt',
  'IsArray',
  'IsOptional',
  'IsEmail',
  'IsUUID',
  'IsEnum',
  'IsDate',
  'IsObject',
  'IsNotEmpty',
  'IsNotEmptyObject',
  'IsIn',
  'Min',
  'Max',
  'MinLength',
  'MaxLength',
  'Length',
  'Matches',
  'ArrayMinSize',
  'ArrayMaxSize',
  'ValidateNested',
  // class-transformer
  'Type',
  'Transform',
  'Expose',
  'Exclude',
];

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
      )
        continue;
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

interface Offender {
  readonly file: string;
  readonly decorators: readonly string[];
}

function audit(): Offender[] {
  const out: Offender[] = [];
  for (const path of walk(SRC)) {
    const rel = relative('.', path).replace(/\\/g, '/');
    const src = readFileSync(path, 'utf8');

    // Cheap check: must import from class-validator or class-transformer
    // OR use a decorator that's pretty clearly one of theirs. Without the
    // import filter we'd false-flag any unrelated `@Type(...)` call.
    if (
      !/from\s+['"]class-validator['"]/.test(src) &&
      !/from\s+['"]class-transformer['"]/.test(src)
    )
      continue;

    const found = new Set<string>();
    for (const dec of FORBIDDEN_DECORATORS) {
      const re = new RegExp(`@${dec}\\s*\\(`);
      if (re.test(src)) found.add(dec);
    }
    if (found.size > 0) {
      out.push({ file: rel, decorators: [...found].sort() });
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

const BASELINE_FILE = join(__dirname, 'class-validator-leakage.baseline.json');

interface Baseline {
  readonly count: number;
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

function writeBaseline(next: Baseline): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
}

describe('class-validator / class-transformer leakage', () => {
  it('files using class-validator/class-transformer decorators only shrink', () => {
    const offenders = audit();
    const stored = readBaseline();
    const current = offenders.length;

    if (current > 0) {
      console.warn(
        `\nclass-validator / class-transformer leakage (${current}):\n${offenders
          .map((o) => `  - ${o.file} → ${o.decorators.join(', ')}`)
          .join('\n')}\n`,
      );
    }

    if (current < stored.count) {
      writeBaseline({ count: current });
    }

    expect(current).toBeLessThanOrEqual(stored.count);
  });
});
