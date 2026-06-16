/**
 * Style Scoring Criteria Seed — the v1 data-driven rubric.
 *
 * Each row is one tunable criterion evaluated by a code function keyed by
 * `key` (see resume-styles/domain/rules/style-criteria/criteria-evaluators.ts).
 * Weights sum to 100 across four buckets; the two seeded system styles
 * (ATS Classic / ATS Compact) satisfy every criterion → score 100.
 *
 *   structure   35  (single-column, standard paper, auto page break)
 *   typography  30  (ATS-safe fonts, valid size, simple headings)
 *   contrast    20  (WCAG ≥ 4.5 on primary + secondary text)
 *   decorations 15  (no shadows / large radius / gradients)
 *
 * Tunable without a deploy: weights, thresholds and allowlists live here.
 */

import type { Prisma, PrismaClient } from '@prisma/client';

// ATS-safe font allowlist — the metric-stable system/serif classics plus the
// widely-embedded web faces. Display/geometric faces (playfair-display,
// poppins) are intentionally excluded as risky for ATS/OCR body text.
const ATS_SAFE_FONTS = [
  'calibri',
  'arial',
  'georgia',
  'times-new-roman',
  'garamond',
  'cambria',
  'merriweather',
  'source-serif',
  'lato',
  'open-sans',
  'roboto',
  'inter',
];

type CriterionSeed = {
  key: string;
  bucket: string;
  weight: number;
  severity: string;
  params: Prisma.InputJsonValue;
};

export const STYLE_SCORING_CRITERIA_V1: readonly CriterionSeed[] = [
  // ── structure (35) ─────────────────────────────────────────────────
  {
    key: 'structure.single_column_layout',
    bucket: 'structure',
    weight: 20,
    severity: 'high',
    params: { safeLayoutTypes: ['single-column', 'compact'] },
  },
  {
    key: 'structure.single_column_kind',
    bucket: 'structure',
    weight: 5,
    severity: 'high',
    params: {},
  },
  {
    key: 'structure.standard_paper_size',
    bucket: 'structure',
    weight: 5,
    severity: 'low',
    params: { safePaperSizes: ['a4', 'letter'] },
  },
  {
    key: 'structure.auto_page_break',
    bucket: 'structure',
    weight: 5,
    severity: 'low',
    params: { safePageBreaks: ['auto', 'section-aware'] },
  },
  // ── typography (30) ────────────────────────────────────────────────
  {
    key: 'typography.safe_body_font',
    bucket: 'typography',
    weight: 12,
    severity: 'high',
    params: { safeFonts: ATS_SAFE_FONTS },
  },
  {
    key: 'typography.safe_heading_font',
    bucket: 'typography',
    weight: 8,
    severity: 'medium',
    params: { safeFonts: ATS_SAFE_FONTS },
  },
  {
    key: 'typography.valid_font_size',
    bucket: 'typography',
    weight: 5,
    severity: 'low',
    params: { safeFontSizes: ['sm', 'base', 'lg'] },
  },
  {
    key: 'typography.simple_heading_style',
    bucket: 'typography',
    weight: 5,
    severity: 'low',
    params: { unsafeHeadingStyles: ['accent-border'] },
  },
  // ── contrast (20) ──────────────────────────────────────────────────
  {
    key: 'contrast.primary_text_contrast',
    bucket: 'contrast',
    weight: 14,
    severity: 'high',
    params: { minRatio: 4.5 },
  },
  {
    key: 'contrast.secondary_text_contrast',
    bucket: 'contrast',
    weight: 6,
    severity: 'medium',
    params: { minRatio: 4.5 },
  },
  // ── decorations (15) ───────────────────────────────────────────────
  {
    key: 'decorations.no_shadows',
    bucket: 'decorations',
    weight: 7,
    severity: 'medium',
    params: {},
  },
  {
    key: 'decorations.modest_border_radius',
    bucket: 'decorations',
    weight: 4,
    severity: 'low',
    params: { safeBorderRadii: ['none', 'sm', 'md'] },
  },
  {
    key: 'decorations.no_gradients',
    bucket: 'decorations',
    weight: 4,
    severity: 'low',
    params: {},
  },
];

export async function seedStyleScoringCriteria(prisma: PrismaClient): Promise<void> {
  // Drop criteria no longer in the v1 set so the rubric always matches code.
  await prisma.styleScoringCriterion.deleteMany({
    where: { key: { notIn: STYLE_SCORING_CRITERIA_V1.map((c) => c.key) } },
  });

  for (const c of STYLE_SCORING_CRITERIA_V1) {
    await prisma.styleScoringCriterion.upsert({
      where: { key: c.key },
      update: { bucket: c.bucket, weight: c.weight, severity: c.severity, params: c.params, active: true },
      create: { ...c, active: true },
    });
  }

  const total = STYLE_SCORING_CRITERIA_V1.reduce((sum, c) => sum + c.weight, 0);
  console.log(`✅ Seeded ${STYLE_SCORING_CRITERIA_V1.length} style-scoring criteria (weights sum to ${total})`);
}
