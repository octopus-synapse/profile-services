import { describe, expect, it } from 'bun:test';
import { LayoutKind } from '@prisma/client';
import { SYSTEM_STYLES } from '../../../../../../prisma/seeds/resume-styles.seed';
import { STYLE_SCORING_CRITERIA_V1 } from '../../../../../../prisma/seeds/style-scoring-criteria.seed';
import type { StyleIssueSeverity, StyleScoringCriterionDef } from '../../types';
import { scoreStyle } from './score-style';

// The same rubric the catalog seeds into the DB, mapped to the domain type.
const CRITERIA: StyleScoringCriterionDef[] = STYLE_SCORING_CRITERIA_V1.map((c) => ({
  key: c.key,
  bucket: c.bucket,
  weight: c.weight,
  severity: c.severity as StyleIssueSeverity,
  params: c.params as Record<string, unknown>,
}));

describe('scoreStyle (data-driven rubric v1)', () => {
  it('the rubric weights sum to 100', () => {
    expect(CRITERIA.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it('both seeded system styles score a perfect 100 with no issues', () => {
    for (const style of SYSTEM_STYLES) {
      const result = scoreStyle(
        { styleConfig: style.styleConfig as Record<string, unknown>, layoutKind: style.layoutKind },
        CRITERIA,
      );
      expect(result.overall, `${style.name} should score 100`).toBe(100);
      expect(result.issues, `${style.name} should have no issues`).toEqual([]);
      expect(result.breakdown).toEqual({
        structure: 35,
        typography: 30,
        contrast: 20,
        decorations: 15,
      });
    }
  });

  it('a non-ATS-safe template scores below the 80 gate and reports issues', () => {
    // Two-column + display font + shadows + gradient + full radius — the
    // antithesis of an ATS-safe template.
    const badStyle = {
      layout: { type: 'two-column', paperSize: 'legal', pageBreakBehavior: 'manual' },
      tokens: {
        typography: {
          fontFamily: { heading: 'playfair-display', body: 'playfair-display' },
          fontSize: 'base',
          headingStyle: 'accent-border',
        },
        colors: {
          colors: {
            background: '#FFFFFF',
            text: { primary: '#CCCCCC', secondary: '#DDDDDD', accent: '#EEEEEE' },
          },
          borderRadius: 'full',
          shadows: 'strong',
          gradients: { enabled: true, direction: 'diagonal' },
        },
      },
    };

    const result = scoreStyle(
      { styleConfig: badStyle, layoutKind: LayoutKind.DOUBLE_COLUMN },
      CRITERIA,
    );

    expect(result.overall).toBeLessThan(80);
    expect(result.issues.length).toBeGreaterThan(0);
    // Spot-check a couple of the expected failure codes.
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('STYLE_MULTI_COLUMN_LAYOUT');
    expect(codes).toContain('STYLE_SHADOWS_PRESENT');
  });
});
