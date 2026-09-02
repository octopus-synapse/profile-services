/**
 * Resume Styles Seed — two system `ResumeStyle` rows, both ATS-safe. SHARED
 * bucket: it runs on every deploy, so production actually has styles (they
 * used to live in dev/ and prod's catalog was empty — the onboarding style
 * step degraded to a raw form there).
 *
 * User-facing names are deliberately descriptive — the name says what the
 * template LOOKS like, the preview sells it, and the ATS guarantee lives in
 * the Style Score (both score 100). Ex "Verso"/"Prosa", renamed because the
 * poetry said nothing:
 *   - "Clássico" (ex Verso) → templates/     (typst path: 'default')
 *   - "Compacto" (ex Prosa) → templates-ats/ (typst path: 'ats')
 *
 * Both styles satisfy every criterion of the data-driven Style Score rubric
 * (see style-scoring-criteria.seed.ts), so their `styleScore` is 100 with an
 * empty issue list. The breakdown mirrors the rubric's bucket weights.
 *
 * `ResumeStyle.authorId` is a required FK, and prod has no dev admin — the
 * seed owns a passwordless "system" author (find-or-create by email, never
 * loginable) so the bucket invariant (idempotent, self-sufficient) holds.
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
    name: 'Clássico',
    description: 'Coluna única com respiro — atemporal e fácil de ler.',
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
    name: 'Compacto',
    description: 'Coluna única mais densa — cabe mais conteúdo por página.',
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

const SYSTEM_AUTHOR_EMAIL = 'system@patchcareers.org';

/** The catalog's owner row: passwordless (never loginable), inactive-by-use,
 *  exists only so the required `authorId` FK has a stable target in prod. */
async function ensureSystemAuthor(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: SYSTEM_AUTHOR_EMAIL } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      email: SYSTEM_AUTHOR_EMAIL,
      name: 'Patch Careers',
      emailVerified: new Date(),
      passwordHash: null,
    },
  });
  return created.id;
}

export async function seedResumeStyles(prisma: PrismaClient): Promise<void> {
  const authorId = await ensureSystemAuthor(prisma);

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
        authorId,
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
        authorId,
        isSystem: true,
      },
    });
    console.log(`  ✓ ResumeStyle "${style.name}" (score ${style.styleScore}/100)`);
  }
  console.log(`✅ Seeded ${SYSTEM_STYLES.length} system resume styles`);
}
