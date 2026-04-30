/**
 * Outbound port for the admin analytics dashboard.
 *
 * The use case orchestrates ten independent reads in parallel; each
 * port method is one of those reads. None of them mutate state, so
 * the entire surface is read-only by design. Adapters do whatever
 * SQL gymnastics they need (raw queries, groupBy, etc.) and return
 * the already-shaped domain payload — the use case never sees Prisma.
 */

export type AdminAnalyticsPeriod = 'day' | 'week' | 'month';

export interface UserGrowthBucket {
  readonly date: string;
  readonly count: number;
}

export interface ResumesByLanguageBucket {
  readonly language: string;
  readonly count: number;
}

export interface AtsScoreBucket {
  readonly bucket: string;
  readonly count: number;
}

export interface MostUsedSection {
  readonly sectionTypeId: string;
  readonly title: string;
  readonly key: string;
  readonly count: number;
}

export interface SourceCount {
  readonly source: string;
  readonly count: number;
}

export interface ActiveUsersStats {
  readonly dau: number;
  readonly mau: number;
}

export interface ContentStats {
  readonly posts: number;
  readonly comments: number;
  readonly reactions: number;
}

export interface SocialStats {
  readonly pendingInvitations: number;
  readonly acceptedConnections: number;
  readonly rejectedConnections: number;
  readonly blockedUsers: number;
  readonly acceptanceRate: number;
}

export interface JobStats {
  readonly postedJobs: number;
  readonly activeJobs: number;
  readonly applications: number;
  readonly withdrawn: number;
  readonly applicationsPerJob: number;
}

export abstract class AdminAnalyticsRepositoryPort {
  abstract getUserGrowth(period: AdminAnalyticsPeriod): Promise<UserGrowthBucket[]>;
  abstract getResumesByLanguage(): Promise<ResumesByLanguageBucket[]>;
  abstract getAtsScoreDistribution(): Promise<AtsScoreBucket[]>;
  abstract getMostUsedSections(): Promise<MostUsedSection[]>;
  abstract getImportSources(): Promise<SourceCount[]>;
  abstract getViewSources(): Promise<SourceCount[]>;
  abstract getActiveUsers(): Promise<ActiveUsersStats>;
  abstract getContentStats(): Promise<ContentStats>;
  abstract getSocialStats(): Promise<SocialStats>;
  abstract getJobStats(): Promise<JobStats>;
}
