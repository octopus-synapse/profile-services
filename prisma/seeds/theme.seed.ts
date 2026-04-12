/**
 * Theme Seed - Main Entry
 *
 * Only ATS-Optimized theme is seeded as system theme.
 * ATS score is calculated by ThemeATSScoringStrategy — never hardcoded.
 */

import { PrismaClient } from '@prisma/client';
import type { ThemeStyleConfig } from '@/bounded-contexts/ats-validation/ats/interfaces/theme-ats-scoring.interface';
import { ThemeATSScoringStrategy } from '@/bounded-contexts/ats-validation/ats/scoring/theme-ats-scoring.strategy';
import { ATS_THEME } from './ats-theme.seed';

const scorer = new ThemeATSScoringStrategy();

function calculateAtsScore(styleConfig: Record<string, unknown>): number {
  const breakdown = scorer.score(styleConfig as ThemeStyleConfig);
  return scorer.calculateOverallScore(breakdown);
}

export const systemThemes = [ATS_THEME];

export async function seedThemes(prisma: PrismaClient, adminId: string) {
  // Remove legacy system themes that are not ATS-optimized
  await prisma.resumeTheme.deleteMany({
    where: {
      id: { in: ['system-modern', 'system-classic', 'system-minimal'] },
      isSystemTheme: true,
    },
  });

  for (const theme of systemThemes) {
    const id = `system-${theme.name.toLowerCase().replace(/\s+/g, '-')}`;
    const atsScore = calculateAtsScore(theme.styleConfig as Record<string, unknown>);

    await prisma.resumeTheme.upsert({
      where: { id },
      update: { ...theme, authorId: adminId, atsScore },
      create: { id, ...theme, authorId: adminId, atsScore },
    });

    console.log(`  ✓ ${theme.name}: ATS score ${atsScore}/100`);
  }
  console.log(`✅ Seeded ${systemThemes.length} system theme(s)`);
}
