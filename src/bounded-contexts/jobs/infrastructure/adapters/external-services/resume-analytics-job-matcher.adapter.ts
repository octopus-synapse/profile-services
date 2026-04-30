/**
 * Adapter that satisfies the `ResumeJobMatcherPort` by delegating to
 * `ResumeAnalyticsFacade` from the analytics BC. Lives in
 * infrastructure/ so the application layer stays free of cross-BC
 * imports — only the wiring sees both ports.
 */

import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import {
  ResumeJobMatcherPort,
  type ResumeJobMatchResult,
} from '../../../domain/ports/resume-job-matcher.port';

export class ResumeAnalyticsJobMatcherAdapter extends ResumeJobMatcherPort {
  constructor(private readonly facade: ResumeAnalyticsFacade) {
    super();
  }

  async matchJobDescription(
    resumeId: string,
    userId: string,
    jobDescription: string,
  ): Promise<ResumeJobMatchResult> {
    const result = await this.facade.matchJobDescription(resumeId, userId, jobDescription);
    return {
      matchScore: result.matchScore,
      matchedKeywords: result.matchedKeywords,
      missingKeywords: result.missingKeywords,
      partialMatches: result.partialMatches,
      recommendations: result.recommendations,
    };
  }
}
