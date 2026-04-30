/**
 * Outbound port for the keyword-match engine our `GetJobFitUseCase`
 * relies on. Defined in the jobs slice so the use case stays free of
 * cross-BC imports — the analytics adapter implements it and the
 * module wires the binding.
 */

export interface ResumeJobMatchResult {
  readonly matchScore: number;
  readonly matchedKeywords: string[];
  readonly missingKeywords: string[];
  readonly partialMatches: Array<{ resumeKeyword: string; jobKeyword: string; similarity: number }>;
  readonly recommendations: string[];
}

export abstract class ResumeJobMatcherPort {
  abstract matchJobDescription(
    resumeId: string,
    userId: string,
    jobDescription: string,
  ): Promise<ResumeJobMatchResult>;
}
