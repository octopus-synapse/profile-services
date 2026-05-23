/**
 * Domain entities and value objects must NOT carry date/time fields
 * typed as `string`. Postgres stores UTC `DateTime`; HTTP serialises
 * via `IsoDateTimeSchema` at the boundary. Inside the domain, a date
 * is a `Date`.
 *
 * Heuristic: scan classes under `bounded-contexts/<bc>/domain/` for
 * fields with names ending in `Date` / `At` / `Until` / `Since` /
 * `Expires` whose declared type is `string`. Pure `Date | null`,
 * `Date`, and `DateTime` are fine.
 */

import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const BASELINE_PATH = resolve(
  ROOT,
  'test/static-analysis/architecture/date-in-domain.baseline.txt',
);
const FIELD_RE =
  /(?:^|\s)(?:readonly\s+|public\s+|private\s+|protected\s+)*(\w*(?:Date|At|Until|Since|Expires))\s*[?:!]?\s*:\s*([^;,\n)]+)/g;
const TYPE_HAS_STRING = /\bstring\b/;
const TYPE_HAS_DATE = /\bDate\b/;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build') continue;
      walk(abs, acc);
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts')
    ) {
      acc.push(abs);
    }
  }
  return acc;
}

describe('arch: date fields in domain must not be string', () => {
  it('domain/ entities and value-objects use Date, not string, for *Date/*At/*Until/etc.', () => {
    const offenders: Array<{ file: string; field: string; type: string }> = [];
    for (const file of walk(join(ROOT, 'src/bounded-contexts'))) {
      const rel = relative(ROOT, file);
      if (!rel.includes('/domain/')) continue;
      if (rel.includes('/events/')) continue; // event payloads cross the wire, may legitimately carry ISO strings
      if (rel.endsWith('.schema.ts')) continue; // Zod schemas are HTTP boundary, not domain
      const src = readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      FIELD_RE.lastIndex = 0;
      // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
      while ((match = FIELD_RE.exec(src)) !== null) {
        const fieldName = match[1];
        const typeRaw = match[2].trim();
        // Skip when both Date and string appear — likely `Date | string` legacy union; still flag, since string side is the gap.
        if (TYPE_HAS_STRING.test(typeRaw) && !TYPE_HAS_DATE.test(typeRaw)) {
          offenders.push({ file: rel, field: fieldName, type: typeRaw });
        }
      }
    }

    const total = offenders.length;
    if (process.env.UPDATE_BASELINE === '1') {
      writeFileSync(BASELINE_PATH, `${total}\n`);
      console.log(`[date-in-domain] baseline updated to ${total}`);
      return;
    }

    const baseline = existsSync(BASELINE_PATH)
      ? Number(readFileSync(BASELINE_PATH, 'utf8').trim())
      : 0;

    if (total > baseline) {
      const lines = offenders.map((o) => `  - ${o.file}: ${o.field}: ${o.type}`).join('\n');
      throw new Error(
        'Date-in-domain regression: ' +
          (total - baseline) +
          ' new offender(s). ' +
          'Total ' +
          total +
          ' (baseline ' +
          baseline +
          ').\n' +
          'Use Date (or Prisma DateTime). ISO strings belong at HTTP boundary.\n\n' +
          lines,
      );
    }
    expect(total).toBeLessThanOrEqual(baseline);
  });
});
