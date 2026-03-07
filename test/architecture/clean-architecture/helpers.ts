/**
 * Clean Architecture Test Helpers
 *
 * Shared utilities for architecture validation tests.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export const SOURCE_ROOT = 'src/bounded-contexts';

export function directoryExists(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

export function getFilesInDirectory(dirPath: string, extension?: string): string[] {
  if (!directoryExists(dirPath)) return [];

  return fs.readdirSync(dirPath).filter((file) => {
    const fullPath = path.join(dirPath, file);
    if (!fs.statSync(fullPath).isFile()) return false;
    if (extension) return file.endsWith(extension);
    return true;
  });
}

export function getSubdirectories(dirPath: string): string[] {
  if (!directoryExists(dirPath)) return [];

  return fs.readdirSync(dirPath).filter((item) => {
    return fs.statSync(path.join(dirPath, item)).isDirectory();
  });
}

export function getAllTypeScriptFiles(dirPath: string): string[] {
  const files: string[] = [];
  if (!directoryExists(dirPath)) return files;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTypeScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function relativePath(file: string): string {
  return file.replace(`${SOURCE_ROOT}/`, '');
}
