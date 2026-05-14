/**
 * Resume Styles Seed — two system `ResumeStyle` rows, both ATS-safe.
 *
 * Both styles render through Typst templates that already shipped:
 *   - "ats-classic"  → templates/        (paired typst path: 'default')
 *   - "ats-compact"  → templates-ats/    (paired typst path: 'ats')
 *
 * `styleScore` is hardcoded conservatively (88 / 92) above the default
 * ATS-safety threshold (70). The monotonic trigger only blocks decreases
 * on UPDATE; equal values during re-seeds are allowed.
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
  atsSafetyBreakdown: Prisma.InputJsonValue;
};

const SYSTEM_STYLES: readonly SystemStyleSeed[] = [
  {
    id: '01900000-0000-7000-8000-000000000001',
    name: 'ATS Classic',
    description:
      'Single-column, neutral palette, Calibri body. Optimised for ATS parsers — safe default for most online portals.',
    typstTemplate: 'default',
    styleScore: 88,
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
    atsSafetyBreakdown: { layout: 30, typography: 28, fileLevel: 30 },
  },
  {
    id: '01900000-0000-7000-8000-000000000002',
    name: 'ATS Compact',
    description:
      'Single-column, dense spacing, Helvetica body. Same ATS guarantees as Classic but fits more content per page.',
    typstTemplate: 'ats',
    styleScore: 92,
    layoutKind: LayoutKind.SINGLE_COLUMN,
    styleConfig: {
      version: '1.0.0',
      layout: {
        type: 'single-column',
        paperSize: 'a4',
        margins: 'narrow',
        pageBreakBehavior: 'auto',
      },
      tokens: {
        typography: {
          fontFamily: { heading: 'helvetica', body: 'helvetica' },
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
    atsSafetyBreakdown: { layout: 32, typography: 30, fileLevel: 30 },
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
        atsSafetyBreakdown: style.atsSafetyBreakdown,
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
        atsSafetyBreakdown: style.atsSafetyBreakdown,
        styleScore: style.styleScore,
        authorId: adminId,
        isSystem: true,
      },
    });
    console.log(`  ✓ ResumeStyle "${style.name}" (score ${style.styleScore}/100)`);
  }
  console.log(`✅ Seeded ${SYSTEM_STYLES.length} system resume styles`);
}
