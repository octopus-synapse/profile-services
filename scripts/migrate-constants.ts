#!/usr/bin/env ts-node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join } from 'path';

const SRC_ROOT = join(__dirname, '../src');

async function migrateConstantsImports() {
  const tsFiles = await glob('**/*.ts', {
    cwd: SRC_ROOT,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/constants/app.constants.ts',
    ],
  });

  let updatedCount = 0;

  for (const filePath of tsFiles) {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Replace imports from app.constants to config
    content = content.replace(
      /from ['"](.*)\/constants\/app\.constants['"]/g,
      (match, pathPrefix) => {
        return `from '${pathPrefix}/constants/config'`;
      },
    );

    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Updated: ${filePath.replace(SRC_ROOT, 'src')}`);
      updatedCount++;
    }
  }

  console.log(`\n${updatedCount} file(s) updated`);
  console.log(
    '\n🗑️  You can now safely delete src/common/constants/app.constants.ts',
  );
}

migrateConstantsImports().catch(console.error);
