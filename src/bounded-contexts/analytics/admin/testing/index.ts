/**
 * In-memory implementation of `AdminAnalyticsRepositoryPort` for use
 * case specs. Every metric returns whatever was seeded; defaults are
 * empty / zero so a test only has to seed what it actually asserts on.
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
} from '../domain/ports/admin-analytics.repository.port';

interface AdminAnalyticsSeed {
  userGrowth?: Partial<Record<AdminAnalyticsPeriod, UserGrowthBucket[]>>;
  resumesByLanguage?: ResumesByLanguageBucket[];
  atsScoreDistribution?: AtsScoreBucket[];
  mostUsedSections?: MostUsedSection[];
  importSources?: SourceCount[];
  viewSources?: SourceCount[];
  activeUsers?: ActiveUsersStats;
  contentStats?: ContentStats;
  socialStats?: SocialStats;
  jobStats?: JobStats;
}

export class InMemoryAdminAnalyticsRepository extends AdminAnalyticsRepositoryPort {
  private state: Required<AdminAnalyticsSeed> = {
    userGrowth: { day: [], week: [], month: [] },
    resumesByLanguage: [],
    atsScoreDistribution: [],
    mostUsedSections: [],
    importSources: [],
    viewSources: [],
    activeUsers: { dau: 0, mau: 0 },
    contentStats: { posts: 0, comments: 0, reactions: 0 },
    socialStats: {
      pendingInvitations: 0,
      acceptedConnections: 0,
      rejectedConnections: 0,
      blockedUsers: 0,
      acceptanceRate: 0,
    },
    jobStats: {
      postedJobs: 0,
      activeJobs: 0,
      applications: 0,
      withdrawn: 0,
      applicationsPerJob: 0,
    },
  };

  seed(seed: AdminAnalyticsSeed): void {
    this.state = {
      userGrowth: { ...this.state.userGrowth, ...(seed.userGrowth ?? {}) },
      resumesByLanguage: seed.resumesByLanguage ?? this.state.resumesByLanguage,
      atsScoreDistribution: seed.atsScoreDistribution ?? this.state.atsScoreDistribution,
      mostUsedSections: seed.mostUsedSections ?? this.state.mostUsedSections,
      importSources: seed.importSources ?? this.state.importSources,
      viewSources: seed.viewSources ?? this.state.viewSources,
      activeUsers: seed.activeUsers ?? this.state.activeUsers,
      contentStats: seed.contentStats ?? this.state.contentStats,
      socialStats: seed.socialStats ?? this.state.socialStats,
      jobStats: seed.jobStats ?? this.state.jobStats,
    };
  }

  async getUserGrowth(period: AdminAnalyticsPeriod): Promise<UserGrowthBucket[]> {
    return this.state.userGrowth[period] ?? [];
  }
  async getResumesByLanguage() {
    return this.state.resumesByLanguage;
  }
  async getAtsScoreDistribution() {
    return this.state.atsScoreDistribution;
  }
  async getMostUsedSections() {
    return this.state.mostUsedSections;
  }
  async getImportSources() {
    return this.state.importSources;
  }
  async getViewSources() {
    return this.state.viewSources;
  }
  async getActiveUsers() {
    return this.state.activeUsers;
  }
  async getContentStats() {
    return this.state.contentStats;
  }
  async getSocialStats() {
    return this.state.socialStats;
  }
  async getJobStats() {
    return this.state.jobStats;
  }
}
