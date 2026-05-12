/**
 * Repository convention (Q10 from the duplication audit):
 *   get*  → returns T (throws on miss)
 *   find* → returns T | null
 *   list* → returns T[]
 *
 * `findAll*` is the historical antipattern — it's neither `find` (singular,
 * nullable) nor `list` (plural, always-array). Old projects accumulate it
 * organically; the convention here is `list*`.
 *
 * This test only forbids `findAll*` (the actual antipattern). Other
 * prefixes are too varied to enumerate cleanly (search, block, archive,
 * seed in test doubles, etc.) and we trust review to keep them sensible.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
      walk(abs, acc);
    } else if (entry.endsWith('.repository.ts') && !entry.endsWith('.spec.ts')) {
      acc.push(abs);
    }
  }
  return acc;
}

const METHOD_RE =
  /^\s*(?:public|private|protected|async|readonly|static|\s)*\s*(findAll[A-Z][\w$]*)\s*\(/gm;

describe('arch: repository naming — no findAll*', () => {
  it('repositories must not declare findAll* methods (use list*)', () => {
    const offenders: Array<{ file: string; method: string }> = [];
    for (const file of walk(join(ROOT, 'src/bounded-contexts'))) {
      const src = readFileSync(file, 'utf8');
      if (!/class\s+\w+Repository\b/.test(src)) continue;
      const rel = relative(ROOT, file);
      let match: RegExpExecArray | null;
      // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
      while ((match = METHOD_RE.exec(src)) !== null) {
        offenders.push({ file: rel, method: match[1] });
      }
      METHOD_RE.lastIndex = 0;
    }

    if (offenders.length > 0) {
      const lines = offenders.map((o) => '  - ' + o.file + ': ' + o.method).join('\n');
      throw new Error('findAll* antipattern detected — rename to list*:\n' + lines);
    }
    expect(offenders).toEqual([]);
  });
});
