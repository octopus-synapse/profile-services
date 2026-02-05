#!/usr/bin/env bun
/**
 * Add @SdkExport decorator to all controllers with @ApiTags
 *
 * This script scans all controllers and adds @SdkExport decorator
 * to those that have @ApiTags but don't have @SdkExport yet.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Find all controllers with @ApiTags
const output = execSync(
  'grep -r "@ApiTags" src --include="*.controller.ts" -l',
  { encoding: 'utf-8' },
);

const controllers = output.trim().split('\n').filter(Boolean);

console.log(`Found ${controllers.length} controllers with @ApiTags\n`);

let modified = 0;
let skipped = 0;

for (const filePath of controllers) {
  let content = readFileSync(filePath, 'utf-8');

  // Skip if already has @SdkExport
  if (content.includes('@SdkExport')) {
    console.log(`  ⏭️  ${filePath} - already has @SdkExport`);
    skipped++;
    continue;
  }

  // Extract tag from @ApiTags
  const apiTagsMatch = content.match(/@ApiTags\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  if (!apiTagsMatch) {
    console.log(`  ⚠️  ${filePath} - could not extract tag from @ApiTags`);
    skipped++;
    continue;
  }

  const tag = apiTagsMatch[1].toLowerCase().replace(/\s+/g, '-');

  // Generate description from tag
  const description =
    apiTagsMatch[1]
      .split(/[-\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') + ' API';

  // Check if controller has auth (ApiBearerAuth or UseGuards(JwtAuthGuard))
  const requiresAuth =
    content.includes('@ApiBearerAuth') ||
    content.includes('JwtAuthGuard') ||
    !content.includes('@Public()');

  // Add import if not present
  if (
    !content.includes(
      "from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator'",
    )
  ) {
    // Find a good place to add the import (after other decorator imports)
    const importMatch = content.match(
      /(import\s*\{[^}]*\}\s*from\s*['"]@nestjs\/swagger['"];?\n)/,
    );
    if (importMatch) {
      const insertPos = importMatch.index! + importMatch[0].length;
      const importLine = `import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';\n`;
      content =
        content.slice(0, insertPos) + importLine + content.slice(insertPos);
    } else {
      // Fallback: add after first import block
      const firstImportEnd = content.indexOf('\n\n');
      if (firstImportEnd > 0) {
        const importLine = `import { SdkExport } from '@/bounded-contexts/platform/common/decorators/sdk-export.decorator';\n`;
        content =
          content.slice(0, firstImportEnd) +
          '\n' +
          importLine +
          content.slice(firstImportEnd);
      }
    }
  }

  // Add @SdkExport before @ApiTags
  const sdkExportDecorator = `@SdkExport({ tag: '${tag}', description: '${description}'${requiresAuth ? '' : ', requiresAuth: false'} })\n`;
  content = content.replace(/@ApiTags\(/, sdkExportDecorator + '@ApiTags(');

  writeFileSync(filePath, content);
  console.log(`  ✅ ${filePath} - added @SdkExport({ tag: '${tag}' })`);
  modified++;
}

console.log(`\n📊 Summary:`);
console.log(`  Modified: ${modified}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Total: ${controllers.length}`);
