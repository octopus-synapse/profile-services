/**
 * Read port into the job-match engine, scoped to what the tailor flow
 * needs: the current overall compatibility for (resume, job) plus the
 * keyword sub-signal the estimate rule re-derives after tailoring.
 *
 * Implemented in infrastructure by delegating to the job-match BC's
 * ComputeMatchUseCase; `null` on any failure — the estimate is
 * best-effort garnish on the tailor response, never a blocker.
 */

export type TailorMatchBreakdown = {
  overallScore: number;
  keywordScore: number | null;
  /** Effective (renormalised) weight of the keyword signal, 0..1. */
  keywordWeight: number;
  matched: string[];
  missing: string[];
};

export abstract class TailorMatchPort {
  abstract computeForJob(
    userId: string,
    resumeId: string,
    jobId: string,
  ): Promise<TailorMatchBreakdown | null>;
}
