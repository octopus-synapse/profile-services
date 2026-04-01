/**
 * Security Test Utilities
 *
 * Shared utilities for static security analysis tests.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const SRC_DIR = path.resolve(__dirname, '../../../src');
export const ROOT_DIR = path.resolve(__dirname, '../../..');

/**
 * Search codebase using grep with proper escaping.
 * Uses -E for extended regex and proper shell escaping.
 */
export function grepCodebase(pattern: string, exclude: string[] = []): string[] {
  const excludeArgs = exclude.map((e) => `--exclude-dir=${e}`).join(' ');
  try {
    // Use -E for extended regex and single quotes for pattern
    const result = execSync(
      `grep -rEn '${pattern}' ${SRC_DIR} ${excludeArgs} --include='*.ts' 2>/dev/null || true`,
      {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * Search codebase using fixed string matching (no regex).
 */
export function grepCodebaseFixed(text: string, exclude: string[] = []): string[] {
  const excludeArgs = exclude.map((e) => `--exclude-dir=${e}`).join(' ');
  try {
    const result = execSync(
      `grep -rFn '${text}' ${SRC_DIR} ${excludeArgs} --include='*.ts' 2>/dev/null || true`,
      {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
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
