/**
 * Seeds ERROR_DICTIONARY in `packages/i18n/src/errors.ts` with stubs for
 * every concrete DomainException code that doesn't yet have an entry.
 *
 * Intentionally conservative:
 *   - Existing entries are never overwritten (human translations stay).
 *   - New stubs use a humanized form of the code for BOTH locales so a
 *     human translator can spot them (and the arch-test 'suspicious mirrors'
 *     assertion will flag them until someone fills in a real PT-BR message).
 *   - Orphan keys (dictionary entries without a matching code) are listed
 *     but NOT removed — the author decides.
 *
 * Output: list of stubs added / orphans to the console. The TS file is
 * written back sorted by key.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';
const DICT_PATH = 'packages/i18n/src/errors.ts';

const CLASS_DECL_RE = /export\s+(abstract\s+)?class\s+(\w+)\s+extends\s+([A-Za-z_][\w]*)/g;
const CODE_LITERAL_RE = /readonly\s+code(?:\s*:\s*string)?\s*=\s*['"]([A-Z][A-Z0-9_]*)['"]/;

const KNOWN_BASES = new Set([
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

function listFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'testing' || entry.name === '__mocks__') continue;
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, acc);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) acc.push(full);
  }
  return acc;
}

function extractBody(src: string, from: number): string {
  const open = src.indexOf('{', from);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open);
}

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function discoverCodes(): string[] {
  const codes = new Set<string>();
  for (const file of listFiles(SOURCE_ROOT)) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('extends ')) continue;
    CLASS_DECL_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while (true) {
      match = CLASS_DECL_RE.exec(src);
      if (!match) break;
      const [, isAbstract, , parent] = match;
      if (isAbstract) continue;
      if (!KNOWN_BASES.has(parent)) continue;
      const body = extractBody(src, match.index);
      const code = body.match(CODE_LITERAL_RE)?.[1];
      if (code) codes.add(code);
    }
  }
  return [...codes].sort();
}

const discovered = discoverCodes();

// Load existing dictionary via dynamic import — the module is a static TS
// `const` so we can just require() it; parcel of bun.
const modulePath = path.resolve(DICT_PATH);
const dictModule = await import(modulePath);
const existing = dictModule.ERROR_DICTIONARY as Record<string, { en: string; 'pt-BR': string }>;

const toAdd: string[] = discovered.filter((c) => !Object.hasOwn(existing, c));
const orphans: string[] = Object.keys(existing)
  .filter((c) => !discovered.includes(c))
  .sort();

if (toAdd.length === 0) {
  console.log(`ERROR_DICTIONARY already covers all ${discovered.length} discovered codes.`);
} else {
  // Build merged dictionary.
  const merged: Record<string, { en: string; 'pt-BR': string }> = { ...existing };
  for (const code of toAdd) {
    const human = humanize(code);
    merged[code] = { en: human, 'pt-BR': human };
  }

  const sortedKeys = Object.keys(merged).sort();
  const entries = sortedKeys
    .map((key) => {
      const entry = merged[key];
      return `  ${key}: {\n    en: ${JSON.stringify(entry.en)},\n    'pt-BR': ${JSON.stringify(entry['pt-BR'])},\n  },`;
    })
    .join('\n');

  const currentSource = fs.readFileSync(DICT_PATH, 'utf8');
  // Replace the object literal between `export const ERROR_DICTIONARY = {` and
  // the closing `} as const satisfies LocalizedDictionary;`.
  const openMarker = 'export const ERROR_DICTIONARY = {';
  const closeMarker = '} as const satisfies LocalizedDictionary;';
  const openIdx = currentSource.indexOf(openMarker);
  const closeIdx = currentSource.indexOf(closeMarker);
  if (openIdx < 0 || closeIdx < 0) {
    console.error('Could not locate ERROR_DICTIONARY markers in', DICT_PATH);
    process.exit(1);
  }
  const before = currentSource.slice(0, openIdx + openMarker.length);
  const after = currentSource.slice(closeIdx);
  const nextSource = `${before}\n${entries}\n${after}`;
  fs.writeFileSync(DICT_PATH, nextSource);
  console.log(`Added ${toAdd.length} stub(s) to ERROR_DICTIONARY:`);
  for (const c of toAdd) console.log(`  + ${c}`);
}

if (orphans.length > 0) {
  console.log(`\nOrphan keys (no class emits these codes):`);
  for (const c of orphans) console.log(`  - ${c}`);
  console.log('Review and remove manually if intended.');
}
