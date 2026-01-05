#!/usr/bin/env ts-node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join } from 'path';

const SRC_ROOT = join(__dirname, '../src');

async function addVersionPrefix() {
  const controllerFiles = await glob('**/*.controller.ts', {
    cwd: SRC_ROOT,
    absolute: true,
  });

  let updatedCount = 0;

  for (const filePath of controllerFiles) {
    let content = readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Replace @Controller('route') with @Controller('v1/route')
    // Skip if already has v1/ prefix
    content = content.replace(
      /@Controller\('([^'v][^']*)'\)/g,
      (match, route) => {
        // Skip health check - needs to stay at root
        if (route === 'health') {
          return match;
        }
        return `@Controller('v1/${route}')`;
      },
    );

    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Updated: ${filePath.replace(SRC_ROOT, 'src')}`);
      updatedCount++;
    }
  }

  console.log(`\n${updatedCount} controller(s) updated with v1/ prefix`);
}

addVersionPrefix().catch(console.error);
