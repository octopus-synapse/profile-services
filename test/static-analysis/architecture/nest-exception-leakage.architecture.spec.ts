/**
 * Nest exception leakage audit
 *
 * The application/domain layers are supposed to be framework-agnostic POJOs.
 * Throwing `NotFoundException` / `BadRequestException` / `ConflictException`
 * etc. straight from `@nestjs/common` couples them to the framework: a future
 * swap to Hono/Fastify/Express would have to rewrite every use case.
 *
 * The right pattern (already followed by every BC's `domain/exceptions/`) is:
 *   - Use cases throw a typed domain subclass (`StyleNotFoundError`,
 *     `OnboardingAlreadyCompletedException`, etc.) that extends a base
 *     from `@/shared-kernel/exceptions` (`EntityNotFoundException`,
 *     `BusinessRuleViolationException`, …) carrying `code` + `statusHint`.
 *   - The HTTP layer's `DomainExceptionFilter` does the translation.
 *
 * This test fails if a use-case file imports an HTTP exception class from
 * `@nestjs/common`. The baseline is ratcheted down on each fix; once at 0 the
 * application layer has no Nest exception leakage.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'src/bounded-contexts';

const NEST_HTTP_EXCEPTIONS = new Set([
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
]);

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
  readonly classes: readonly string[];
}

function audit(): Offender[] {
  const out: Offender[] = [];
  for (const path of walk(SRC)) {
    const rel = relative('.', path).replace(/\\/g, '/');
    // Only application/domain are framework-free. Infrastructure (controllers,
    // adapters, filters) is allowed to depend on Nest.
    if (!rel.match(/\/(application|domain)\//)) continue;
    const src = readFileSync(path, 'utf8');
    const importMatches = src.matchAll(
      /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]@nestjs\/common['"]/g,
    );
    const offending = new Set<string>();
    for (const m of importMatches) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().replace(/^type\s+/, '');
        if (NEST_HTTP_EXCEPTIONS.has(name)) offending.add(name);
      }
    }
    if (offending.size > 0) {
      out.push({ file: rel, classes: [...offending].sort() });
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

const BASELINE_FILE = join(__dirname, 'nest-exception-leakage.baseline.json');

interface Baseline {
  readonly count: number;
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

function writeBaseline(next: Baseline): void {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(next, null, 2)}\n`);
}

describe('Nest exception leakage', () => {
  it('application/domain files importing Nest HTTP exceptions only shrink', () => {
    const offenders = audit();
    const stored = readBaseline();
    const current = offenders.length;

    if (current > 0) {
      console.warn(
        `\nNest exception leakage (${current}):\n${offenders
          .map((o) => `  - ${o.file} → ${o.classes.join(', ')}`)
          .join('\n')}\n`,
      );
    }

    if (current < stored.count) {
      writeBaseline({ count: current });
    }

    expect(current).toBeLessThanOrEqual(stored.count);
  });
});
