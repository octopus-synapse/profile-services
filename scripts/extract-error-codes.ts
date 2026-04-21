/**
 * Walks src/ for every concrete DomainException subclass and extracts the
 * literal `code` string. Used to seed the i18n catalog skeletons.
 *
 * Output: sorted list of unique codes to stdout.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';

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

console.log(JSON.stringify([...codes].sort(), null, 2));
