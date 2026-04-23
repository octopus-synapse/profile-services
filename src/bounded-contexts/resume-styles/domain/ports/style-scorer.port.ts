/**
 * Style Scorer Port — abstraction for computing a ResumeStyle's
 * ATS-safety score. In the MVP the implementation is deterministic
 * (layout / typography / file-level rules); see docs/scoring/README.md
 * for the rubric.
 *
 * The real implementation is wired in the resume-styles/ infrastructure
 * layer. No cross-bounded-context coupling.
 */

export interface StyleScoreBreakdown {
  layout: number;
  typography: number;
  fileLevel: number;
}

export abstract class StyleScorerPort {
  abstract score(styleConfig: Record<string, unknown>): StyleScoreBreakdown;
  abstract calculateOverallScore(breakdown: StyleScoreBreakdown): number;
}
