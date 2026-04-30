/**
 * Wraps `ResumeAnalyticsFacade` from the analytics BC to satisfy the
 * automation BC's `ResumeJobMatcherPort`. Keeps cross-BC isolation —
 * application/domain only sees the port; only this adapter touches
 * the analytics facade.
 */

import { ResumeAnalyticsFacade } from '@/bounded-contexts/analytics/resume-analytics/services/resume-analytics.facade';
import {
  ResumeJobMatcherPort,
  type ResumeJobMatchScore,
} from '../../../domain/ports/resume-job-matcher.port';

export class ResumeAnalyticsJobMatcherAdapter extends ResumeJobMatcherPort {
  constructor(private readonly facade: ResumeAnalyticsFacade) {
    super();
  }

  async matchJobDescription(
    resumeId: string,
    userId: string,
    jobText: string,
  ): Promise<ResumeJobMatchScore> {
    const result = await this.facade.matchJobDescription(resumeId, userId, jobText);
    return { matchScore: result.matchScore };
  }
}
