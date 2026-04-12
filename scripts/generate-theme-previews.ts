#!/usr/bin/env bun
/**
 * Generate theme preview PDFs for all system themes.
 *
 * Usage: bun run scripts/generate-theme-previews.ts
 *
 * Boots the NestJS app, finds all system themes, and generates
 * a PDF preview for each using the configured preview resume.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/bounded-contexts/platform/prisma/prisma.service';
import { ThemePreviewService } from '../src/bounded-contexts/presentation/themes/services/theme-preview.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const previewService = app.get(ThemePreviewService);

  const systemThemes = await prisma.resumeTheme.findMany({
    where: { isSystemTheme: true },
    select: { id: true, name: true, thumbnailUrl: true },
  });

  console.log(`Found ${systemThemes.length} system theme(s)`);

  for (const theme of systemThemes) {
    console.log(`Generating preview for "${theme.name}" (${theme.id})...`);
    const url = await previewService.generateAndUploadPreview(theme.id);
    if (url) {
      console.log(`  ✓ ${url}`);
    } else {
      console.log(`  ✗ Failed (check logs)`);
    }
  }

  await app.close();
  console.log('Done');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
