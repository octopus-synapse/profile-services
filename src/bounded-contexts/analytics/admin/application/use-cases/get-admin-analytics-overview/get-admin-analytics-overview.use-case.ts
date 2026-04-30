/**
 * Aggregates platform-wide analytics for the admin dashboard. Fans out
 * to ten independent reads in parallel — none of which depend on each
 * other — then returns the assembled snapshot. All numbers are derived
 * directly from the live tables; there is no caching here because the
 * UI re-fetches on demand and the dashboard tolerates slight staleness.
 *
 * Period selectors (passed straight through to user-growth bucketing):
 *   - day   → user growth in the last 30 days, bucketed by day
 *   - week  → last 12 weeks, bucketed by week (default)
 *   - month → last 12 months, bucketed by month
 */

import {
  type ActiveUsersStats,
  type AdminAnalyticsPeriod,
  AdminAnalyticsRepositoryPort,
  type AtsScoreBucket,
  type ContentStats,
  type JobStats,
  type MostUsedSection,
  type ResumesByLanguageBucket,
  type SocialStats,
  type SourceCount,
  type UserGrowthBucket,
} from '../../../domain/ports/admin-analytics.repository.port';

export type Period = AdminAnalyticsPeriod;

export interface AdminAnalyticsOverview {
  readonly userGrowth: UserGrowthBucket[];
  readonly resumesByLanguage: ResumesByLanguageBucket[];
  readonly atsScoreDistribution: AtsScoreBucket[];
  readonly mostUsedSections: MostUsedSection[];
  readonly importSources: SourceCount[];
  readonly viewSources: SourceCount[];
  readonly activeUsers: ActiveUsersStats;
  readonly contentStats: ContentStats;
  readonly socialStats: SocialStats;
  readonly jobStats: JobStats;
}

export class GetAdminAnalyticsOverviewUseCase {
  constructor(private readonly repository: AdminAnalyticsRepositoryPort) {}

  async execute(period: Period = 'week'): Promise<AdminAnalyticsOverview> {
    const [
      userGrowth,
      resumesByLanguage,
      atsScoreDistribution,
      mostUsedSections,
      importSources,
      viewSources,
      activeUsers,
      contentStats,
      socialStats,
      jobStats,
    ] = await Promise.all([
      this.repository.getUserGrowth(period),
      this.repository.getResumesByLanguage(),
      this.repository.getAtsScoreDistribution(),
      this.repository.getMostUsedSections(),
      this.repository.getImportSources(),
      this.repository.getViewSources(),
      this.repository.getActiveUsers(),
      this.repository.getContentStats(),
      this.repository.getSocialStats(),
      this.repository.getJobStats(),
    ]);

    return {
      userGrowth,
      resumesByLanguage,
      atsScoreDistribution,
      mostUsedSections,
      importSources,
      viewSources,
      activeUsers,
      contentStats,
      socialStats,
      jobStats,
    };
  }
}
