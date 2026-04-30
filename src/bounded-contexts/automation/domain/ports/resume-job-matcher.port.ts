/**
 * Outbound port the curated selector calls to score a (resume, job)
 * pair. The adapter wraps `ResumeAnalyticsFacade` from the analytics
 * BC; defining the port here keeps automation's domain free of
 * cross-BC imports.
 */

export interface ResumeJobMatchScore {
  readonly matchScore: number;
}

export abstract class ResumeJobMatcherPort {
  abstract matchJobDescription(
    resumeId: string,
    userId: string,
    jobText: string,
  ): Promise<ResumeJobMatchScore>;
}
