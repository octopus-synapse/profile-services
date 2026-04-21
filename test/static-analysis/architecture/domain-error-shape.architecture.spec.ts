/**
 * DomainError Shape Architecture Test
 *
 * Every `throw new DomainError({ … })` must carry a code literal (SCREAMING_SNAKE_CASE).
 * Dynamic codes (`new DomainError({ code: variable })`) are banned — they defeat
 * catalog coverage: the parity test can't know which catalog key to check.
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(abs));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      out.push(abs);
    }
  }
  return out;
}

describe('DomainError shape', () => {
  it('every throw new DomainError(...) carries a SCREAMING_SNAKE_CASE code literal', () => {
    const files = listSourceFiles(SOURCE_ROOT);
    const offenders: string[] = [];

    const throwRe = /throw\s+new\s+DomainError\s*\(\s*\{([^}]*)\}/g;
    const codeLiteralRe = /code\s*:\s*['"]([A-Z][A-Z0-9_]*)['"]/;

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('new DomainError')) continue;
      throwRe.lastIndex = 0;
      let match: RegExpExecArray | null;
      while (true) {
        match = throwRe.exec(source);
        if (!match) break;
        const body = match[1];
        if (!codeLiteralRe.test(body)) {
          const line = source.slice(0, match.index).split('\n').length;
          offenders.push(`${file}:${line} → missing code literal`);
        }
      }
    }

    expect(
      offenders,
      `DomainError throws must use a string literal for code:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
