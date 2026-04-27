/**
 * Route descriptors for the resume-analytics submodule. Replaces
 * `ResumeAnalyticsController`. The SSE controller stays as a legacy
 * Nest controller because the synthesizer doesn't model SSE yet.
 *
 * Bundle token is the existing `ResumeAnalyticsFacade`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';

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

export const resumeAnalyticsRoutes: ReadonlyArray<Route<ResumeAnalyticsFacade>> = [
  {
    method: 'POST',
    path: '/resume-analytics/:resumeId/track-view',
    auth: { kind: 'public' },
    params: ResumeIdParam,
    body: TrackViewBody,
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
      return { success: true, data: { message: 'View tracked successfully' } };
    },
  },
  {
    method: 'GET',
    path: '/resume-analytics/:resumeId/views',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: ViewStatsQuery,
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
      return { success: true, data: stats };
    },
  },
  {
    method: 'GET',
    path: '/resume-analytics/:resumeId/ats-score',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    openapi: {
      summary: 'Calculate ATS compatibility score',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const score = await facade.calculateATSScore(resumeId, ctx.user!.userId);
      return { success: true, data: score };
    },
  },
  {
    method: 'GET',
    path: '/resume-analytics/:resumeId/keywords',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: KeywordOptionsQuery,
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
      return { success: true, data: suggestions };
    },
  },
  {
    method: 'POST',
    path: '/resume-analytics/:resumeId/match-job',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    body: JobMatchBody,
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
      return { success: true, data: match };
    },
  },
  {
    method: 'GET',
    path: '/resume-analytics/:resumeId/benchmark',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: BenchmarkOptionsQuery,
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
      return { success: true, data: benchmark };
    },
  },
  {
    method: 'GET',
    path: '/resume-analytics/:resumeId/dashboard',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    openapi: {
      summary: 'Get complete analytics dashboard',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const dashboard = await facade.getDashboard(resumeId, ctx.user!.userId);
      return { success: true, data: dashboard };
    },
  },
  {
    method: 'POST',
    path: '/resume-analytics/:resumeId/snapshot',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    openapi: {
      summary: 'Save analytics snapshot for tracking progress',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const snapshot = await facade.saveSnapshot(resumeId, ctx.user!.userId);
      return { success: true, data: snapshot };
    },
  },
  {
    method: 'GET',
    path: '/resume-analytics/:resumeId/history',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    query: HistoryQuery as unknown as Route<ResumeAnalyticsFacade>['query'],
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
      return { success: true, data: history };
    },
  },
  {
    method: 'GET',
    path: '/resume-analytics/:resumeId/progression',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    openapi: {
      summary: 'Get score progression over time',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const progression = await facade.getScoreProgression(resumeId, ctx.user!.userId);
      return { success: true, data: progression };
    },
  },
];
