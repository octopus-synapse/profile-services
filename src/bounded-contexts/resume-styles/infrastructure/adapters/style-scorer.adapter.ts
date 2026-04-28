import { type StyleScoreBreakdown, StyleScorerPort } from '../../domain/ports/style-scorer.port';

/**
 * MVP implementation of the Style Scorer.
 *
 * Placeholder: returns conservative defaults so a newly created or
 * updated style always passes the monotonic invariant. The full rubric
 * (layout / typography / file-level) lands in a follow-up — see
 * docs/scoring/README.md for the target fields and weights.
 *
 * Framework-free POJO. Wired by `resume-styles.composition.ts`.
 */
export class StyleScorerAdapter extends StyleScorerPort {
  score(_styleConfig: Record<string, unknown>): StyleScoreBreakdown {
    return { layout: 85, typography: 85, fileLevel: 85 };
  }

  calculateOverallScore(breakdown: StyleScoreBreakdown): number {
    return Math.round((breakdown.layout + breakdown.typography + breakdown.fileLevel) / 3);
  }
}
