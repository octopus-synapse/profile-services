import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UserGrowthEntrySchema = z.object({
  date: z.string(),
  count: z.number().int(),
});

const ResumesByLanguageEntrySchema = z.object({
  language: z.string(),
  count: z.number().int(),
});

const AtsScoreDistributionEntrySchema = z.object({
  bucket: z.string(),
  count: z.number().int(),
});

const MostUsedSectionEntrySchema = z.object({
  sectionTypeId: z.string(),
  title: z.string(),
  key: z.string(),
  count: z.number().int(),
});

const ImportSourceEntrySchema = z.object({
  source: z.string(),
  count: z.number().int(),
});

const ViewSourceEntrySchema = z.object({
  source: z.string(),
  count: z.number().int(),
});

const ActiveUsersSchema = z.object({
  dau: z.number().int(),
  mau: z.number().int(),
});

const ContentStatsSchema = z.object({
  posts: z.number().int(),
  comments: z.number().int(),
  reactions: z.number().int(),
});

const SocialStatsSchema = z.object({
  pendingInvitations: z.number().int(),
  acceptedConnections: z.number().int(),
  rejectedConnections: z.number().int(),
  blockedUsers: z.number().int(),
  acceptanceRate: z.number().int(),
});

const JobStatsSchema = z.object({
  postedJobs: z.number().int(),
  activeJobs: z.number().int(),
  applications: z.number().int(),
  withdrawn: z.number().int(),
  applicationsPerJob: z.number(),
});

const AdminAnalyticsOverviewDataSchema = z.object({
  userGrowth: z.array(UserGrowthEntrySchema),
  resumesByLanguage: z.array(ResumesByLanguageEntrySchema),
  atsScoreDistribution: z.array(AtsScoreDistributionEntrySchema),
  mostUsedSections: z.array(MostUsedSectionEntrySchema),
  importSources: z.array(ImportSourceEntrySchema),
  viewSources: z.array(ViewSourceEntrySchema),
  activeUsers: ActiveUsersSchema,
  contentStats: ContentStatsSchema,
  socialStats: SocialStatsSchema,
  jobStats: JobStatsSchema,
});

export class AdminAnalyticsOverviewDataDto extends createZodDto(AdminAnalyticsOverviewDataSchema) {}
