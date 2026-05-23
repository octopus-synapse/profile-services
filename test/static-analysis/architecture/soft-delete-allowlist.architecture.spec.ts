/**
 * GDPR / LGPD require erasure on user request. Soft-delete is the
 * exception, not the rule — only models where audit / moderation
 * preservation justifies keeping rows after "deletion" qualify.
 * Today the allowlist is `Message`, `Post`, `PostComment`.
 *
 * The test walks `prisma/schema/*.prisma` and flags any other model
 * that declares `deletedAt DateTime?` OR uses the `@@deletedAt` /
 * `@@softDelete` directive. Adding a model requires updating both
 * the allowlist here and the runtime guard in
 * `bounded-contexts/platform/prisma/soft-delete.ts`.
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ALLOWLIST = new Set(['Message', 'Post', 'PostComment']);
const SCHEMA_ROOT = join(__dirname, '..', '..', '..', 'prisma', 'schema');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walk(abs, acc);
    } else if (entry.endsWith('.prisma')) {
      acc.push(abs);
    }
  }
  return acc;
}

// Strip block comments; preserve newlines so model parsing is line-stable.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_, prefix) => prefix);
}

describe('arch: soft-delete allowlist', () => {
  it('only Message, Post, PostComment carry deletedAt', () => {
    const offenders: Array<{ file: string; model: string }> = [];
    for (const file of walk(SCHEMA_ROOT)) {
      const body = stripComments(readFileSync(file, 'utf8'));
      const modelRegex = /\bmodel\s+(\w+)\s*{([^}]*)}/g;
      let match: RegExpExecArray | null;
      // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex.exec loop
      while ((match = modelRegex.exec(body)) !== null) {
        const [, name, body] = match;
        if (ALLOWLIST.has(name)) continue;
        if (/\bdeletedAt\s+DateTime\?/.test(body)) {
          offenders.push({
            file: relative(join(__dirname, '..', '..', '..'), file),
            model: name,
          });
        }
      }
    }

    if (offenders.length > 0) {
      const lines = offenders.map((o) => `  - ${o.model} in ${o.file}`).join('\n');
      throw new Error(
        `Soft-delete allowlist violation — models not in [Message, Post, PostComment] carry deletedAt:\n${lines}\n\nGDPR/LGPD requires hard-delete for everything else. If this model genuinely needs soft-delete, update the allowlist here AND the runtime guard at bounded-contexts/platform/prisma/soft-delete.ts.`,
      );
    }
    expect(offenders).toEqual([]);
  });
});
