/**
 * Security Test Utilities
 *
 * Shared utilities for static security analysis tests.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const SRC_DIR = path.resolve(__dirname, '../../../src');
export const ROOT_DIR = path.resolve(__dirname, '../../..');

/**
 * Run grep with an argv array (no shell) so a pattern containing quotes,
 * `|`, `()` or other shell metacharacters can never break tokenization —
 * the previous `execSync` template literal produced `/bin/sh: Unterminated
 * quoted string` for any pattern with an embedded quote.
 */
function runGrep(flags: string, pattern: string, exclude: string[]): string[] {
  const args = [
    flags,
    pattern,
    SRC_DIR,
    '--include=*.ts',
    ...exclude.map((e) => `--exclude-dir=${e}`),
  ];
  try {
    // grep exits 1 when there are no matches — execFileSync throws on a
    // non-zero exit, so treat "no matches" as an empty result.
    const result = execFileSync('grep', args, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * Search codebase using grep extended regex (`-rEn`).
 */
export function grepCodebase(pattern: string, exclude: string[] = []): string[] {
  return runGrep('-rEn', pattern, exclude);
}

/**
 * Search codebase using fixed string matching (`-rFn`, no regex).
 */
export function grepCodebaseFixed(text: string, exclude: string[] = []): string[] {
  return runGrep('-rFn', text, exclude);
}

/**
 * Strip grep's `path:lineno:` prefix, returning just the source-line body.
 * Without this, a filename like `request-password-change.use-case.ts` makes
 * every log line in that file look like it "contains password".
 */
export function grepLineContent(grepLine: string): string {
  return grepLine.replace(/^.*?:\d+:/, '');
}

/**
 * Blank out the *content* of string literals on a source line while keeping
 * `${...}` template interpolations intact. Used by the "don't log secrets"
 * specs so a message that merely *mentions* "password"/"token" (e.g.
 * `logger.log('Password-change code issued')`) isn't mistaken for one that
 * logs the secret *value* (`logger.log(\`pwd=${password}\`)`).
 */
export function stripStringLiterals(line: string): string {
  let out = '';
  let quote: "'" | '"' | '`' | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const prev = line[i - 1];
    if (quote) {
      // Inside a template literal, preserve `${ ... }` interpolations —
      // those carry real runtime values and ARE worth flagging.
      if (quote === '`' && ch === '$' && line[i + 1] === '{') {
        let depth = 0;
        let j = i;
        for (; j < line.length; j++) {
          if (line[j] === '{') depth++;
          else if (line[j] === '}' && --depth === 0) break;
        }
        out += line.slice(i, j + 1);
        i = j;
        continue;
      }
      if (ch === quote && prev !== '\\') quote = null;
      continue; // drop the literal character
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Recursively read all TypeScript files in a directory.
 */
export function readAllTsFiles(dir: string, files: string[] = []): string[] {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules', 'dist', '.git'].includes(item.name)) {
      readAllTsFiles(fullPath, files);
    } else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Read file content safely.
 */
export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists.
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
