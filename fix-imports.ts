#!/usr/bin/env node
/**
 * Fix DTO imports by replacing specific section imports with barrel imports
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RESUME_SECTIONS = [
  'achievement',
  'award',
  'bug-bounty',
  'certification',
  'education',
  'experience',
  'hackathon',
  'interest',
  'language',
  'open-source',
  'project',
  'publication',
  'recommendation',
  'skill',
  'talk',
] as const;

const TARGET_DIRECTORIES = [
  'src/resumes/controllers',
  'src/resumes/services',
  'src/resumes/repositories',
] as const;

function fixImportsInFile(filePath: string): boolean {
  let fileContent = readFileSync(filePath, 'utf8');
  let wasUpdated = false;

  RESUME_SECTIONS.forEach((section) => {
    const sectionImportPattern = new RegExp(`from ['"]\\.\\./dto/${section}\\.dto['"];?`, 'g');
    if (sectionImportPattern.test(fileContent)) {
      fileContent = fileContent.replace(sectionImportPattern, `from '../dto';`);
      wasUpdated = true;
    }
  });

  if (wasUpdated) {
    writeFileSync(filePath, fileContent, 'utf8');
  }

  return wasUpdated;
}

function processDirectory(directoryPath: string): void {
  const files = readdirSync(directoryPath).filter((file) => file.endsWith('.ts'));

  let totalFilesProcessed = 0;
  let totalFilesUpdated = 0;

  files.forEach((file) => {
    const filePath = join(directoryPath, file);
    totalFilesProcessed++;

    if (fixImportsInFile(filePath)) {
      totalFilesUpdated++;
      console.log(`✓ Updated: ${filePath}`);
    }
  });

  console.log(
    `\n✅ Processed ${totalFilesProcessed} files in ${directoryPath}, updated ${totalFilesUpdated}`,
  );
}

function main(): void {
  TARGET_DIRECTORIES.forEach((directory) => {
    processDirectory(directory);
  });
}

main();
