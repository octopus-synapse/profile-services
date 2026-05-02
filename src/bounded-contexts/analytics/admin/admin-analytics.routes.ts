/**
 * Route descriptors for the admin-analytics submodule. Replaces
 * `AdminAnalyticsController`. The bundle token is the existing
 * `GetAdminAnalyticsOverviewUseCase` since this submodule has a single
 * use case as its dependency surface.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { GetAdminAnalyticsOverviewUseCase } from './application/use-cases/get-admin-analytics-overview/get-admin-analytics-overview.use-case';

const OverviewQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
const UserGrowthEntrySchema = z.object({
  date: z.string(),
  count: z.number().int().min(0),
});

const ResumesByLanguageEntrySchema = z.object({
  language: z.string(),
  count: z.number().int().min(0),
});

const AtsScoreDistributionEntrySchema = z.object({
  bucket: z.string(),
  count: z.number().int().min(0),
});

const MostUsedSectionEntrySchema = z.object({
  sectionTypeId: z.string(),
  title: z.string(),
  key: z.string(),
  count: z.number().int().min(0),
});

const SourceCountEntrySchema = z.object({
  source: z.string(),
  count: z.number().int().min(0),
});

const ActiveUsersStatsSchema = z.object({
  dau: z.number().int().min(0),
  mau: z.number().int().min(0),
});

const ContentStatsSchema = z.object({
  posts: z.number().int().min(0),
  comments: z.number().int().min(0),
  reactions: z.number().int().min(0),
});

const SocialStatsSchema = z.object({
  pendingInvitations: z.number().int().min(0),
  acceptedConnections: z.number().int().min(0),
  rejectedConnections: z.number().int().min(0),
  blockedUsers: z.number().int().min(0),
  acceptanceRate: z.number(),
});

const JobStatsSchema = z.object({
  postedJobs: z.number().int().min(0),
  activeJobs: z.number().int().min(0),
  applications: z.number().int().min(0),
  withdrawn: z.number().int().min(0),
  applicationsPerJob: z.number(),
});

const AdminAnalyticsOverviewResponseSchema = z.object({
  userGrowth: z.array(UserGrowthEntrySchema),
  resumesByLanguage: z.array(ResumesByLanguageEntrySchema),
  atsScoreDistribution: z.array(AtsScoreDistributionEntrySchema),
  mostUsedSections: z.array(MostUsedSectionEntrySchema),
  importSources: z.array(SourceCountEntrySchema),
  viewSources: z.array(SourceCountEntrySchema),
  activeUsers: ActiveUsersStatsSchema,
  contentStats: ContentStatsSchema,
  socialStats: SocialStatsSchema,
  jobStats: JobStatsSchema,
});

export const adminAnalyticsRoutes: ReadonlyArray<Route<GetAdminAnalyticsOverviewUseCase>> = [
  {
    method: 'GET',
    path: '/v1/admin/analytics/overview',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_ALL,
    query: OverviewQuerySchema,
    response: AdminAnalyticsOverviewResponseSchema,
    openapi: {
      summary: 'Get platform-wide analytics overview',
      tags: ['admin-analytics'],
      description: 'Admin Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, useCase) => {
      const q = ctx.query as z.infer<typeof OverviewQuerySchema>;
      return useCase.execute(q.period ?? 'week');
    },
  },
];
