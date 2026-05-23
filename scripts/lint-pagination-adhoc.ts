#!/usr/bin/env bun
/**
 * Cat 2 #5: pagination params (`limit`, `page`, `pageSize`, `offset`)
 * must flow through `PaginationQuerySchema` from
 * `shared-kernel/schemas/common/api.types.ts` (Q2). The schema does
 * `coerce + clamp + default` declaratively — ad-hoc `Number(q.limit)`
 * or `parseInt(q.page, 10)` in a route handler bypasses the clamp,
 * lets `NaN` through, and diverges silently per-route.
 *
 * Forbidden patterns in `*.routes.ts`:
 *   Number(<expr>.limit)
 *   Number(<expr>.page)
 *   Number(<expr>.pageSize)
 *   Number(<expr>.offset)
 *   parseInt(<expr>.limit ...)
 *   parseInt(<expr>.page ...)
 *   parseInt(<expr>.pageSize ...)
 *   parseInt(<expr>.offset ...)
 *
 * Baseline-ratchet because the audit listed several existing offenders;
 * cleanup is a separate effort.
 *
 * Inline escape `// lint-allow-pagination-adhoc: <reason>` for genuine
 * non-pagination uses of those identifiers (rare).
 *
 * Run: bun run scripts/lint-pagination-adhoc.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');
const BASELINE_PATH = resolve(ROOT, 'scripts/lint-pagination-adhoc.baseline.txt');

const PAT_RE =
  /\b(?:Number|parseInt|parseFloat)\s*\(\s*[a-zA-Z_$][\w$.[\]'"`]*\.(?:limit|page|pageSize|offset)\b/g;
const ESCAPE_RE = /lint-allow-pagination-adhoc:\s*\S/;

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const full = join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) yield* walk(full);
    else if (entry.endsWith('.routes.ts')) yield full;
  }
}

type Site = { file: string; line: number; match: string; escaped: boolean };
const sites: Site[] = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  PAT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex.exec idiom
  while ((m = PAT_RE.exec(src)) !== null) {
    const lineNum = src.slice(0, m.index).split('\n').length;
    const escaped = ESCAPE_RE.test(lines[lineNum - 1] || '');
    sites.push({ file: rel, line: lineNum, match: m[0], escaped });
  }
}

const total = sites.length;

if (process.env.UPDATE_BASELINE === '1') {
  writeFileSync(BASELINE_PATH, `${total}\n`);
  console.log(`[pagination-adhoc] baseline updated to ${total}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? Number(readFileSync(BASELINE_PATH, 'utf8').trim()) : 0;

if (total > baseline) {
  const fresh = sites.filter((s) => !s.escaped);
  console.error(
    `lint-pagination-adhoc: regression — ${total - baseline} new occurrence(s). ` +
      `Total ${total} (baseline ${baseline}).`,
  );
  console.error(
    '\nRoute should declare query schema as `PaginationQuerySchema` ' +
      '(or merge it) so the runtime coerce+clamp+default is uniform. ' +
      'See `shared-kernel/schemas/common/api.types.ts`.\n',
  );
  for (const s of fresh.slice(-20)) console.error(`  ${s.file}:${s.line}  ${s.match}`);
  process.exit(1);
}
console.log(`lint-pagination-adhoc: ${total} occurrence(s) (baseline ${baseline}), within budget`);
