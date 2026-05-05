/**
 * DomainException Discipline Architecture Test
 *
 * Enforces the exception contract at PR time so no regression can slip past
 * the TypeScript abstract-member check (which is the first line of defense).
 *
 * Rules:
 *   1. Every concrete (non-abstract) class that extends DomainException
 *      declares a `code` string literal in SCREAMING_SNAKE_CASE and a
 *      `statusHint` numeric literal. No dynamic values (regex only accepts
 *      a quoted string / bare number).
 *   2. User-facing entry layers (controllers, services, use-cases, guards,
 *      filters, pipes) MUST NOT `throw new Error(` or `throw new HttpException(`.
 *      Typed DomainException subclasses are the only accepted path.
 *
 * The allow-list below exists for callsites where a bare Error is the
 * correct idiom (boot-time config, CLI tooling, value-object assertions,
 * inner-loop retry signals caught locally, test-runner wrappers). Each
 * allow-list path is documented so future PRs think twice before adding.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'testing' || entry.name === '__mocks__') continue;
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(full, acc);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function extractClassBody(source: string, fromIndex: number): string {
  const openIdx = source.indexOf('{', fromIndex);
  if (openIdx < 0) return '';
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(openIdx, i + 1);
    }
  }
  return source.slice(openIdx);
}

const CLASS_DECL_RE = /export\s+(abstract\s+)?class\s+(\w+)\s+extends\s+([A-Za-z_][\w]*)/g;
const CODE_LITERAL_RE = /readonly\s+code(?:\s*:\s*string)?\s*=\s*['"]([A-Z][A-Z0-9_]*)['"]/;
const STATUS_HINT_LITERAL_RE = /readonly\s+statusHint(?:\s*:\s*number)?\s*=\s*(\d{3})/;

const KNOWN_BASES_THAT_EXTEND_DOMAIN_EXCEPTION = new Set([
  'DomainException',
  'EntityNotFoundException',
  'ConflictException',
  'UnauthorizedException',
  'ForbiddenException',
  'ValidationException',
  'BusinessRuleViolationException',
  'LimitExceededException',
  'OnboardingValidationException',
]);

describe('DomainException discipline', () => {
  it('every concrete DomainException subclass declares literal code + statusHint', () => {
    const files = listSourceFiles(SOURCE_ROOT);
    const offenders: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('extends ')) continue;

      CLASS_DECL_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while (true) {
        match = CLASS_DECL_RE.exec(source);
        if (!match) break;
        const [, isAbstract, className, parent] = match;
        if (isAbstract) continue;
        if (!KNOWN_BASES_THAT_EXTEND_DOMAIN_EXCEPTION.has(parent)) continue;
        if (className === parent) continue;

        const body = extractClassBody(source, match.index);
        const hasCode = CODE_LITERAL_RE.test(body);
        const hasStatus = STATUS_HINT_LITERAL_RE.test(body) || hasInheritedStatus(parent);

        if (!hasCode) {
          offenders.push(
            `${path.relative(process.cwd(), file)}: ${className} missing literal \`code\``,
          );
        }
        if (!hasStatus) {
          offenders.push(
            `${path.relative(process.cwd(), file)}: ${className} missing literal \`statusHint\``,
          );
        }
      }
    }

    expect(
      offenders,
      `Every DomainException subclass must declare code + statusHint as literals:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('no raw `throw new Error(` or `throw new HttpException(` in user-facing layers', () => {
    const files = listSourceFiles(SOURCE_ROOT);
    const offenders: string[] = [];

    const targetDirs = [
      '/controllers/',
      '/application/use-cases/',
      '/services/',
      '/application/services/',
      '/infrastructure/guards/',
      '/shared-kernel/authorization/',
      '/filters/',
      '/pipes/',
    ];

    // Paths where bare throw new Error() is correct idiom (boot-time asserts,
    // CLI, inner-loop signals caught locally, decorator misuse guards).
    const allowed = [
      '/infrastructure/strategies/jwt.strategy.ts',
      '/prisma/prisma-client-options.ts',
      '/prisma/prisma.service.ts',
      '/config/schemas/env.schema.ts',
      '/cache/decorators/cacheable.decorator.ts',
      '/cache/decorators/cache-invalidate.decorator.ts',
      '/rate-limit/rate-limit.guard.ts',
      '/health/indicators/',
      '/test-runner/test-runner.service.ts',
      '/pr-comment/',
      '/shared-kernel/authorization/ownership.guard.ts', // assert-never paths; typed Errors for real failures live in authorization.exceptions
    ];

    const BAD_RE = /throw\s+new\s+(Error|HttpException)\s*\(/g;

    for (const file of files) {
      const rel = file;
      if (!targetDirs.some((dir) => rel.includes(dir))) continue;
      if (allowed.some((a) => rel.includes(a))) continue;

      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('throw new')) continue;
      BAD_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while (true) {
        match = BAD_RE.exec(source);
        if (!match) break;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(
          `${path.relative(process.cwd(), file)}:${line} uses bare \`new ${match[1]}\` in a user-facing path`,
        );
      }
    }

    expect(
      offenders,
      `User-facing code must throw typed DomainException subclasses:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});

// --- helpers ---------------------------------------------------------------

/** Parents whose base class already sets `statusHint`; a subclass that does
 *  not override it still satisfies the abstract contract. */
function hasInheritedStatus(parent: string): boolean {
  return [
    'EntityNotFoundException',
    'ConflictException',
    'UnauthorizedException',
    'ForbiddenException',
    'ValidationException',
    'BusinessRuleViolationException',
    'LimitExceededException',
    'OnboardingValidationException',
  ].includes(parent);
}
