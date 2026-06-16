/**
 * Resume Styles Seed — two system `ResumeStyle` rows, both ATS-safe.
 *
 * Both styles render through Typst templates that already shipped:
 *   - "ats-classic"  → templates/        (paired typst path: 'default')
 *   - "ats-compact"  → templates-ats/    (paired typst path: 'ats')
 *
 * Both styles satisfy every criterion of the data-driven Style Score rubric
 * (see style-scoring-criteria.seed.ts), so their `styleScore` is 100 with an
 * empty issue list. The breakdown mirrors the rubric's bucket weights.
 *
 * Plan reference: scoring refactor — Style Score taxonomy + 2-style MVP.
 */

import { LayoutKind, type Prisma, type PrismaClient } from '@prisma/client';

type SystemStyleSeed = {
  id: string;
  name: string;
  description: string;
  typstTemplate: string;
  styleScore: number;
  layoutKind: LayoutKind;
  styleConfig: Prisma.InputJsonValue;
  styleScoreBreakdown: Prisma.InputJsonValue;
};

// Both system styles pass every rubric criterion → full points per bucket.
const PERFECT_BREAKDOWN: Prisma.InputJsonValue = {
  buckets: { structure: 35, typography: 30, contrast: 20, decorations: 15 },
  issues: [],
};

export const SYSTEM_STYLES: readonly SystemStyleSeed[] = [
  {
    id: '01900000-0000-7000-8000-000000000001',
    name: 'ATS Classic',
    description:
      'Single-column, neutral palette, Calibri body. Optimised for ATS parsers — safe default for most online portals.',
    typstTemplate: 'default',
    styleScore: 100,
    layoutKind: LayoutKind.SINGLE_COLUMN,
    // ResumeDslSchema-compliant styleConfig. The DSL schema requires:
    // layout.{type,paperSize,margins,pageBreakBehavior}, tokens.colors.{colors,borderRadius,shadows},
    // tokens.spacing.{density,sectionGap,itemGap,contentPadding}, tokens.typography.*, sections.
    // Reference: `test/infrastructure/e2e/fixtures/dsl.fixture.ts::createValidDsl()`.
    styleConfig: {
      version: '1.0.0',
      layout: {
        type: 'single-column',
        paperSize: 'a4',
        margins: 'normal',
        pageBreakBehavior: 'auto',
      },
      tokens: {
        typography: {
          fontFamily: { heading: 'calibri', body: 'calibri' },
          fontSize: 'base',
          headingStyle: 'bold',
        },
        colors: {
          colors: {
            primary: '#111111',
            secondary: '#444444',
            background: '#FFFFFF',
            surface: '#F9FAFB',
            text: { primary: '#1A1A1A', secondary: '#444444', accent: '#222222' },
            border: '#CCCCCC',
            divider: '#E5E7EB',
          },
          borderRadius: 'sm',
          shadows: 'none',
        },
        spacing: {
          density: 'comfortable',
          sectionGap: 'md',
          itemGap: 'md',
          contentPadding: 'md',
        },
      },
      sections: [],
    },
    styleScoreBreakdown: PERFECT_BREAKDOWN,
  },
  {
    id: '01900000-0000-7000-8000-000000000002',
    name: 'ATS Compact',
    description:
      'Single-column, dense spacing, Helvetica body. Same ATS guarantees as Classic but fits more content per page.',
    typstTemplate: 'ats',
    styleScore: 100,
    layoutKind: LayoutKind.SINGLE_COLUMN,
    styleConfig: {
      version: '1.0.0',
      layout: {
        type: 'single-column',
        paperSize: 'a4',
        // `compact` is the valid DSL enum for narrow margins (`narrow` is
        // not a MarginSize). The Typst `ats` template hardcodes its own
        // 12mm margins, so this only affects schema validity.
        margins: 'compact',
        pageBreakBehavior: 'auto',
      },
      tokens: {
        typography: {
          // `arial` is the metric-compatible, schema-valid stand-in for
          // Helvetica (not in FontFamily). The `ats` template hardcodes its
          // serif face regardless, so this only affects schema validity.
          fontFamily: { heading: 'arial', body: 'arial' },
          fontSize: 'sm',
          headingStyle: 'bold',
        },
        colors: {
          colors: {
            primary: '#0D0D0D',
            secondary: '#3A3A3A',
            background: '#FFFFFF',
            surface: '#F9FAFB',
            text: { primary: '#0D0D0D', secondary: '#3A3A3A', accent: '#0D0D0D' },
            border: '#BFBFBF',
            divider: '#E5E7EB',
          },
          borderRadius: 'sm',
          shadows: 'none',
        },
        spacing: {
          density: 'compact',
          sectionGap: 'sm',
          itemGap: 'sm',
          contentPadding: 'sm',
        },
      },
      sections: [],
    },
    styleScoreBreakdown: PERFECT_BREAKDOWN,
  },
];

export async function seedResumeStyles(prisma: PrismaClient, adminId: string): Promise<void> {
  // Clean up legacy system rows (pre-rename) so the set always lands at
  // exactly the styles defined here. Idempotent: re-runs touch nothing.
  await prisma.resumeStyle.deleteMany({
    where: {
      isSystem: true,
      id: { notIn: SYSTEM_STYLES.map((s) => s.id) },
    },
  });

  for (const style of SYSTEM_STYLES) {
    await prisma.resumeStyle.upsert({
      where: { id: style.id },
      update: {
        name: style.name,
        description: style.description,
        typstTemplate: style.typstTemplate,
        layoutKind: style.layoutKind,
        styleConfig: style.styleConfig,
        styleScoreBreakdown: style.styleScoreBreakdown,
        styleScore: style.styleScore,
        authorId: adminId,
        isSystem: true,
      },
      create: {
        id: style.id,
        name: style.name,
        description: style.description,
        typstTemplate: style.typstTemplate,
        layoutKind: style.layoutKind,
        styleConfig: style.styleConfig,
        styleScoreBreakdown: style.styleScoreBreakdown,
        styleScore: style.styleScore,
        authorId: adminId,
        isSystem: true,
      },
    });
    console.log(`  ✓ ResumeStyle "${style.name}" (score ${style.styleScore}/100)`);
  }
  console.log(`✅ Seeded ${SYSTEM_STYLES.length} system resume styles`);
}
