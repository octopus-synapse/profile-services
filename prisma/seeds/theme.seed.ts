/**
 * Theme Seed - Main Entry
 */

import { PrismaClient } from '@prisma/client';
import { CLASSIC_THEME } from './classic-theme.seed';
import { MINIMAL_THEME } from './minimal-theme.seed';
import { MODERN_THEME } from './modern-theme.seed';

export const systemThemes = [MODERN_THEME, CLASSIC_THEME, MINIMAL_THEME];

export async function seedThemes(prisma: PrismaClient, adminId: string) {
  for (const theme of systemThemes) {
    const id = `system-${theme.name.toLowerCase()}`;
    await prisma.resumeTheme.upsert({
      where: { id },
      update: { ...theme, authorId: adminId },
      create: { id, ...theme, authorId: adminId },
    });
  }
  console.log(`✅ Seeded ${systemThemes.length} system themes`);
}
