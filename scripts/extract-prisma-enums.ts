/**
 * Walks `prisma/schema/**.prisma` and prints every enum + values as JSON.
 * Used to seed the enum dictionary in `packages/i18n/src/enums.ts`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SCHEMA_DIR = 'prisma/schema';

const ENUM_RE = /^enum\s+(\w+)\s*\{([^}]+)\}/gm;

const enums: Record<string, string[]> = {};

for (const entry of fs.readdirSync(SCHEMA_DIR)) {
  if (!entry.endsWith('.prisma')) continue;
  const src = fs.readFileSync(path.join(SCHEMA_DIR, entry), 'utf8');
  ENUM_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while (true) {
    match = ENUM_RE.exec(src);
    if (!match) break;
    const [, name, body] = match;
    const values = body
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, '').trim())
      .filter((l) => l.length > 0 && /^[A-Z][A-Z0-9_]*$/.test(l));
    enums[name] = values.sort();
  }
}

const sorted = Object.fromEntries(Object.entries(enums).sort(([a], [b]) => a.localeCompare(b)));
console.log(JSON.stringify(sorted, null, 2));
