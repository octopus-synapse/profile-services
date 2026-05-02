/**
 * Route descriptors for the resume-analytics submodule. Replaces
 * `ResumeAnalyticsController` and the legacy `AnalyticsSseController`
 * — the SSE streams are now declared as `kind: 'sse'` Route descriptors
 * and wired through a dedicated `AnalyticsSseBundle`.
 *
 * Bundle token for the JSON routes is `ResumeAnalyticsFacade`.
 */

import type { Observable } from 'rxjs';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';

export interface AnalyticsUpdateEvent {
  readonly type: 'view' | 'ats_score';
  readonly resumeId: string;
  readonly data: { views?: number; atsScore?: number; timestamp: Date };
}

export interface AnalyticsSseEvent {
  readonly data: AnalyticsUpdateEvent;
  readonly id: string;
  readonly type: string;
  readonly retry: number;
}

export abstract class AnalyticsSseBundle {
  abstract subscribeToResumeAnalytics(resumeId: string): Observable<AnalyticsSseEvent>;
  abstract subscribeToViews(resumeId: string): Observable<AnalyticsSseEvent>;
  abstract subscribeToAtsScore(resumeId: string): Observable<AnalyticsSseEvent>;
}

const ResumeIdParam = z.object({ resumeId: z.string() });

const TrackViewBody = z.object({
  userAgent: z.string().optional(),
  referer: z.string().optional(),
});

const PeriodEnum = z.enum(['day', 'week', 'month', 'year']);
const ViewStatsQuery = z.object({
  period: PeriodEnum,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const IndustryEnum = z.enum([
  'software_engineering',
  'data_science',
  'devops',
  'product_management',
  'design',
  'marketing',
  'finance',
  'healthcare',
  'education',
  'other',
]);
const ExperienceLevelEnum = z.enum([
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
  'executive',
]);

const KeywordOptionsQuery = z.object({
  industry: IndustryEnum,
  targetRole: z.string().optional(),
});

const JobMatchBody = z.object({ jobDescription: z.string().min(10) });

const BenchmarkOptionsQuery = z.object({
  industry: IndustryEnum,
  experienceLevel: ExperienceLevelEnum.optional(),
});

const HistoryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
type HistoryQueryT = z.infer<typeof HistoryQuery>;

// ─── Response schemas ─────────────────────────────────────────────────
const TrackViewResponseSchema = z.object({ message: z.string() });

const ViewStatsResponseSchema = z.object({
  totalViews: z.number().int().min(0),
  uniqueVisitors: z.number().int().min(0),
  viewsByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().min(0),
      percentage: z.number(),
    }),
  ),
});

const SectionScoreBreakdownSchema = z.object({
  sectionKind: z.string(),
  sectionTypeKey: z.string(),
  score: z.number().int(),
});

const ATSIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  message: z.string(),
  context: z
    .object({
      sectionKind: z.string().optional(),
      missingFields: z.array(z.string()).optional(),
    })
    .optional(),
});

const ATSScoreResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  sectionBreakdown: z.array(SectionScoreBreakdownSchema),
  issues: z.array(ATSIssueSchema),
  recommendations: z.array(z.string()),
});

const KeywordWarningSchema = z.object({
  type: z.enum(['keyword_stuffing', 'low_density', 'irrelevant_keywords']),
  message: z.string(),
  affectedKeywords: z.array(z.string()),
});

const KeywordSuggestionsResponseSchema = z.object({
  existingKeywords: z.array(
    z.object({
      keyword: z.string(),
      count: z.number().int().min(0),
      relevance: z.number(),
    }),
  ),
  missingKeywords: z.array(z.string()),
  keywordDensity: z.number(),
  warnings: z.array(KeywordWarningSchema),
  recommendations: z.array(z.string()),
});

const JobMatchDimensionsSchema = z.object({
  hardSkills: z.number().optional(),
  softSkills: z.number().optional(),
  experience: z.number().optional(),
  languages: z.number().optional(),
  location: z.number().optional(),
});

const JobMatchResponseSchema = z.object({
  matchScore: z.number(),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  partialMatches: z.array(
    z.object({
      resumeKeyword: z.string(),
      jobKeyword: z.string(),
      similarity: z.number(),
    }),
  ),
  recommendations: z.array(z.string()),
  dimensions: JobMatchDimensionsSchema.optional(),
});

const BenchmarkRecommendationSchema = z.object({
  type: z.enum(['content', 'career', 'credential', 'keyword']),
  priority: z.enum(['high', 'medium', 'low']),
  message: z.string(),
  action: z.string(),
});

const IndustryBenchmarkResponseSchema = z.object({
  percentile: z.number(),
  totalInIndustry: z.number().int().min(0),
  comparison: z.object({
    avgATSScore: z.number(),
    yourATSScore: z.number(),
    avgViews: z.number(),
    yourViews: z.number(),
    avgStructuredItemCount: z.number(),
    yourStructuredItemCount: z.number(),
    avgCareerDepthYears: z.number(),
    yourCareerDepthYears: z.number(),
  }),
  topPerformers: z.object({
    commonKeywords: z.array(z.string()),
    avgCareerDepthYears: z.number(),
    avgStructuredItemCount: z.number(),
    commonCredentials: z.array(z.string()),
  }),
  recommendations: z.array(BenchmarkRecommendationSchema),
});

const DashboardRecommendationSchema = z.object({
  type: z.enum(['add_section', 'improve_content', 'add_keywords', 'optimize_format']),
  priority: z.enum(['high', 'medium', 'low']),
  message: z.string(),
});

const AnalyticsDashboardResponseSchema = z.object({
  resumeId: z.string(),
  overview: z.object({
    totalViews: z.number().int().min(0),
    uniqueVisitors: z.number().int().min(0),
    atsScore: z.number().int(),
    keywordScore: z.number().int(),
    industryPercentile: z.number(),
  }),
  viewTrend: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().min(0),
    }),
  ),
  keywordHealth: z.object({
    score: z.number(),
    topKeywords: z.array(z.string()),
    missingCritical: z.array(z.string()),
  }),
  industryPosition: z.object({
    percentile: z.number(),
    trend: z.enum(['improving', 'stable', 'declining']),
  }),
  recommendations: z.array(DashboardRecommendationSchema),
});

const AnalyticsSnapshotResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  atsScore: z.number().int(),
  keywordScore: z.number().int(),
  completenessScore: z.number().int(),
  industryRank: z.number().int().optional(),
  totalInIndustry: z.number().int().optional(),
  topKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  createdAt: z.string().datetime(),
});

const AnalyticsHistoryResponseSchema = z.array(AnalyticsSnapshotResponseSchema);

const ScoreProgressionResponseSchema = z.object({
  snapshots: z.array(
    z.object({
      date: z.string().datetime(),
      score: z.number().int(),
    }),
  ),
  trend: z.enum(['improving', 'stable', 'declining']),
  changePercent: z.number(),
});

export const resumeAnalyticsRoutes: ReadonlyArray<Route<ResumeAnalyticsFacade>> = [
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/analytics/track-view',
    statusCode: 201,
    auth: { kind: 'public' },
    params: ResumeIdParam,
    body: TrackViewBody,
    response: TrackViewResponseSchema,
    openapi: {
      summary: 'Track resume view (public endpoint)',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const ipHeader = ctx.headers['x-forwarded-for'];
      const ip =
        (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader)?.split(',')[0]?.trim() ?? '0.0.0.0';
      const ua = ctx.headers['user-agent'];
      const referer = ctx.headers.referer;
      await facade.trackView({
        resumeId,
        ip,
        userAgent: Array.isArray(ua) ? ua[0] : ua,
        referer: Array.isArray(referer) ? referer[0] : referer,
      });
      return { message: 'View tracked successfully' };
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/analytics/views',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: ViewStatsQuery,
    response: ViewStatsResponseSchema,
    openapi: {
      summary: 'Get view statistics',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const q = ctx.query as z.infer<typeof ViewStatsQuery>;
      const stats = await facade.getViewStats(resumeId, ctx.user!.userId, {
        period: q.period,
        startDate: q.startDate ? new Date(q.startDate) : undefined,
        endDate: q.endDate ? new Date(q.endDate) : undefined,
      });
      return stats;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/analytics/ats-score',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    response: ATSScoreResponseSchema,
    openapi: {
      summary: 'Calculate ATS compatibility score',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const score = await facade.calculateATSScore(resumeId, ctx.user!.userId);
      return score;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/analytics/keywords',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: KeywordOptionsQuery,
    response: KeywordSuggestionsResponseSchema,
    openapi: {
      summary: 'Get keyword optimization suggestions',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const options = ctx.query as z.infer<typeof KeywordOptionsQuery>;
      const suggestions = await facade.getKeywordSuggestions(resumeId, ctx.user!.userId, options);
      return suggestions;
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/analytics/match-job',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    body: JobMatchBody,
    response: JobMatchResponseSchema,
    openapi: {
      summary: 'Match resume against job description',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const body = ctx.body as z.infer<typeof JobMatchBody>;
      const match = await facade.matchJobDescription(
        resumeId,
        ctx.user!.userId,
        body.jobDescription,
      );
      return match;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/analytics/benchmark',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: BenchmarkOptionsQuery,
    response: IndustryBenchmarkResponseSchema,
    openapi: {
      summary: 'Get industry benchmark comparison',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const options = ctx.query as z.infer<typeof BenchmarkOptionsQuery>;
      const benchmark = await facade.getIndustryBenchmark(resumeId, ctx.user!.userId, options);
      return benchmark;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/analytics/dashboard',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    response: AnalyticsDashboardResponseSchema,
    openapi: {
      summary: 'Get complete analytics dashboard',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const dashboard = await facade.getDashboard(resumeId, ctx.user!.userId);
      return dashboard;
    },
  },
  {
    method: 'POST',
    path: '/v1/resumes/:resumeId/analytics/snapshot',
    statusCode: 201,
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    response: AnalyticsSnapshotResponseSchema,
    openapi: {
      summary: 'Save analytics snapshot for tracking progress',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const snapshot = await facade.saveSnapshot(resumeId, ctx.user!.userId);
      return snapshot;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/analytics/history',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: HistoryQuery as unknown as Route<ResumeAnalyticsFacade>['query'],
    response: AnalyticsHistoryResponseSchema,
    openapi: {
      summary: 'Get analytics history',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const q = ctx.query as unknown as HistoryQueryT;
      const history = await facade.getHistory(resumeId, ctx.user!.userId, q);
      return history;
    },
  },
  {
    method: 'GET',
    path: '/v1/resumes/:resumeId/analytics/progression',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    response: ScoreProgressionResponseSchema,
    openapi: {
      summary: 'Get score progression over time',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const progression = await facade.getScoreProgression(resumeId, ctx.user!.userId);
      return progression;
    },
  },
];

/**
 * SSE routes for the resume-analytics submodule. Live in a separate
 * group because the `Route<TBundle>` shape pins the bundle type per
 * group — these subscribers consume `AnalyticsSseBundle`, not
 * `ResumeAnalyticsFacade`. Paths preserve the legacy
 * `/v1/analytics/...` prefix from `AnalyticsSseController`.
 */
export const resumeAnalyticsSseRoutes: ReadonlyArray<Route<AnalyticsSseBundle>> = [
  {
    method: 'GET',
    path: '/v1/analytics/:resumeId/live',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    kind: 'sse',
    skip: ['responseWrapper'],
    params: ResumeIdParam,
    openapi: {
      summary: 'Subscribe to live analytics stream',
      tags: ['resume-analytics'],
      description: 'Streams view and ATS score updates for a resume in real time.',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      return bundle.subscribeToResumeAnalytics(resumeId);
    },
  },
  {
    method: 'GET',
    path: '/v1/analytics/:resumeId/views',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    kind: 'sse',
    skip: ['responseWrapper'],
    params: ResumeIdParam,
    openapi: {
      summary: 'Subscribe to live views stream',
      tags: ['resume-analytics'],
      description: 'Streams only view-count updates for a resume.',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      return bundle.subscribeToViews(resumeId);
    },
  },
  {
    method: 'GET',
    path: '/v1/analytics/:resumeId/ats-score',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    kind: 'sse',
    skip: ['responseWrapper'],
    params: ResumeIdParam,
    openapi: {
      summary: 'Subscribe to live ATS stream',
      tags: ['resume-analytics'],
      description: 'Streams only ATS-score updates for a resume.',
    },
    sdk: { exported: false },
    handler: async (ctx, bundle) => {
      const { resumeId } = ctx.params as { resumeId: string };
      return bundle.subscribeToAtsScore(resumeId);
    },
  },
];
