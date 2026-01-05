#!/usr/bin/env ts-node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join } from 'path';

const SRC_ROOT = join(__dirname, '../src');

// Patterns that indicate "what" comments (to remove)
const WHAT_COMMENT_PATTERNS = [
  /^\s*\/\/ Check (for|if|file|whether)/i,
  /^\s*\/\/ Detect/i,
  /^\s*\/\/ Look for/i,
  /^\s*\/\/ Count/i,
  /^\s*\/\/ Get /i,
  /^\s*\/\/ Validate /i,
  /^\s*\/\/ This is a/i,
];

async function removeWhatComments() {
  const files = await glob('ats/validators/*.ts', {
    cwd: SRC_ROOT,
    absolute: true,
  });

  let totalRemoved = 0;

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const newLines: string[] = [];
    let removedInFile = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isWhatComment = WHAT_COMMENT_PATTERNS.some((pattern) =>
        pattern.test(line),
      );

      if (isWhatComment) {
        removedInFile++;
        continue; // Skip this line
      }

      newLines.push(line);
    }

    if (removedInFile > 0) {
      writeFileSync(filePath, newLines.join('\n'), 'utf-8');
      console.log(
        `✓ ${filePath.replace(SRC_ROOT, 'src')}: ${removedInFile} comments removed`,
      );
      totalRemoved += removedInFile;
    }
  }

  console.log(`\n${totalRemoved} what comments removed`);
}

removeWhatComments().catch(console.error);
