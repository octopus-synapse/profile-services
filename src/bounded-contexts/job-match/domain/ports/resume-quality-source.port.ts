/**
 * Read-through to the `resume-quality/` context's latest overall score
 * for a resume. `job-match` only needs the single number as one input to
 * the Readiness blend — the full quality snapshot read lives in its owner
 * context. Kept as a port so use-case tests inject a literal.
 */
export abstract class ResumeQualitySourcePort {
  /** Latest overall Resume Quality Score (0..100), or `null` when none
   * has been computed yet (brand-new resume). */
  abstract getLatestOverallScore(resumeId: string): Promise<number | null>;
}
