/**
 * Route descriptors for the resume-analytics submodule. Replaces
 * `ResumeAnalyticsController` and the legacy `AnalyticsSseController`
 * — the SSE streams are now declared as `kind: 'sse'` Route descriptors
 * and wired through a dedicated `AnalyticsSseBundle`.
 *
 * Bundle token for the JSON routes is `ResumeAnalyticsFacade`.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import {
  AnalyticsDashboardResponseSchema,
  AnalyticsHistoryResponseSchema,
  AnalyticsSnapshotResponseSchema,
  AnalyticsSseBundle,
  ATSScoreResponseSchema,
  AtsSimulationResponseSchema,
  BenchmarkOptionsQuery,
  HistoryQuery,
  HistoryQueryT,
  IndustryBenchmarkResponseSchema,
  JobMatchBody,
  JobMatchResponseSchema,
  KeywordOptionsQuery,
  KeywordSuggestionsResponseSchema,
  ResumeIdParam,
  ScoreProgressionResponseSchema,
  TrackViewBody,
  TrackViewResponseSchema,
  ViewStatsQuery,
  ViewStatsResponseSchema,
} from './resume-analytics.routes.schemas';
import { ResumeAnalyticsFacade } from './services/resume-analytics.facade';

export type { AnalyticsSseBundle, AnalyticsUpdateEvent } from './resume-analytics.routes.schemas';

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
      return { code: 'RESUME_VIEW_TRACKED' as const };
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
    path: '/v1/ats/simulate/:resumeId',
    auth: { kind: 'jwt' },
    permission: Permission.ANALYTICS_READ_OWN,
    params: ResumeIdParam,
    response: AtsSimulationResponseSchema,
    openapi: {
      summary: 'Simulate how a generic ATS parser extracts the resume',
      tags: ['resume-analytics'],
      description: 'Resume Analytics API',
    },
    sdk: { exported: true },
    handler: async (ctx, facade) => {
      const { resumeId } = ctx.params as { resumeId: string };
      const data = await facade.simulateATS(resumeId, ctx.user!.userId);
      return { data };
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
