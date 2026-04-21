/**
 * Seeds the initial i18n catalog skeletons.
 *
 * For every concrete DomainException subclass:
 *   - Extracts the literal `code`.
 *   - Extracts the default `super('message')` literal from the constructor
 *     (when present) — that becomes the en fallback.
 *   - Humanizes the code (UPPER_SNAKE → Title Case) as a last-resort message.
 *
 * Merges with any existing catalog at the destination so hand-tuned
 * translations are preserved. New codes get placeholders; removed codes
 * are kept (audit them manually).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';
const PT_PATH = 'src/bounded-contexts/platform/i18n/messages/errors.pt-BR.json';
const EN_PATH = 'src/bounded-contexts/platform/i18n/messages/errors.en.json';

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

const CLASS_DECL_RE = /export\s+(abstract\s+)?class\s+(\w+)\s+extends\s+([A-Za-z_][\w]*)/g;
const CODE_LITERAL_RE = /readonly\s+code(?:\s*:\s*string)?\s*=\s*['"]([A-Z][A-Z0-9_]*)['"]/;
const SUPER_CALL_RE = /super\(\s*(['"`])([^'"`]*?)\1/;

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

interface Entry {
  code: string;
  defaultMessage: string;
}

const discovered = new Map<string, Entry>();

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
    if (!code) continue;
    const superMatch = body.match(SUPER_CALL_RE);
    const raw = superMatch?.[2];
    // Template-literal-interpolated messages (${var}) can't be reused as a
    // static catalog entry — fall back to humanized code until a human
    // rewrites them as `{param}` placeholders in the catalog.
    const defaultMessage = raw && !raw.includes('${') ? raw : humanize(code);
    if (!discovered.has(code)) discovered.set(code, { code, defaultMessage });
  }
}

function loadExisting(p: string): Record<string, string> {
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeCatalog(p: string, next: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(sorted, null, 2)}\n`);
}

const existingEn = loadExisting(EN_PATH);
const existingPt = loadExisting(PT_PATH);

const en: Record<string, string> = { ...existingEn };
const pt: Record<string, string> = { ...existingPt };

let added = 0;
let cleaned = 0;
for (const [code, entry] of discovered) {
  if (!en[code]) {
    en[code] = entry.defaultMessage;
    added++;
  } else if (en[code].includes('${')) {
    // Replace leaked template-literal messages from a prior seed pass.
    en[code] = entry.defaultMessage;
    cleaned++;
  }
  if (!pt[code]) {
    pt[code] = entry.defaultMessage;
  } else if (pt[code].includes('${')) {
    pt[code] = entry.defaultMessage;
  }
}

writeCatalog(EN_PATH, en);
writeCatalog(PT_PATH, pt);

console.log(`codes discovered: ${discovered.size}`);
console.log(`en entries: ${Object.keys(en).length} (+${added} new, ${cleaned} cleaned)`);
console.log(`pt-BR entries: ${Object.keys(pt).length}`);
