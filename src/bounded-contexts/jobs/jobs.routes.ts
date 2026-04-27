/**
 * Route descriptors for the jobs BC. Replaces `JobController` and
 * `ApplicationTrackerController` (excepting the rate-limited
 * `POST /v1/jobs/import-from-url` route, which keeps its existing
 * Nest controller because the synthesizer doesn't model
 * `@UseGuards(RateLimitGuard)` yet).
 */

import type { EnglishLevel, JobType } from '@prisma/client';
import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { JobsUseCases } from './application/ports/jobs.port';
import {
  ApplyToJobSchema,
  CreateJobSchema,
  UpdateJobSchema,
} from './dto/job.dto';
import { RecordApplicationEventSchema } from './dto/application-event.dto';
import {
  parsePaymentCurrencies,
  parseRemotePolicies,
  parseSkillsCsv,
} from './presenters/job.presenter';

const IdParam = z.object({ id: z.string() });
const ApplicationIdParam = z.object({ applicationId: z.string() });
const CompanyParam = z.object({ company: z.string() });

const JobListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().max(500).optional(),
  jobType: z.string().optional(),
  skills: z.string().max(500).optional(),
  paymentCurrency: z.string().max(100).optional(),
  remotePolicy: z.string().max(100).optional(),
  minEnglishLevel: z.string().optional(),
});

const PageOnlyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

const SimilarQuerySchema = z.object({ limit: z.string().optional() });

const TrackerQuerySchema = z.object({ silentDays: z.string().optional() });

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildJobListInput(q: z.infer<typeof JobListQuerySchema>) {
  return {
    page: Math.min(Math.max(num(q.page, 1), 1), 1000),
    limit: Math.min(Math.max(num(q.limit, 20), 1), 100),
    search: q.search,
    jobType: q.jobType as JobType | undefined,
    skills: parseSkillsCsv(q.skills),
    paymentCurrency: parsePaymentCurrencies(q.paymentCurrency),
    remotePolicy: parseRemotePolicies(q.remotePolicy),
    minEnglishLevel: q.minEnglishLevel as EnglishLevel | undefined,
  };
}

function pageOnly(q: z.infer<typeof PageOnlyQuerySchema>): { page: number; limit: number } {
  return {
    page: Math.min(Math.max(num(q.page, 1), 1), 1000),
    limit: Math.min(Math.max(num(q.limit, 20), 1), 100),
  };
}

export const jobsRoutes: ReadonlyArray<Route<JobsUseCases>> = [
  // ─── Catalog ──────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/jobs',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: JobListQuerySchema,
    openapi: { summary: 'List jobs', tags: ['jobs'], description: 'Jobs API' },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof JobListQuerySchema>;
      return bc.listJobs.execute(buildJobListInput(q), ctx.user!.userId);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/with-fit-score',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: JobListQuerySchema,
    openapi: {
      summary:
        'Same as GET /jobs but each item is enriched with a 0-100 structured fit score for the current user.',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof JobListQuerySchema>;
      return bc.listJobsWithFitScore.execute(buildJobListInput(q), ctx.user!.userId);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/mine',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    query: PageOnlyQuerySchema,
    openapi: {
      summary: 'List jobs the current user (recruiter) authored',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(ctx.query as z.infer<typeof PageOnlyQuerySchema>);
      return bc.listMyJobs.execute(ctx.user!.userId, page, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/bookmarks',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PageOnlyQuerySchema,
    openapi: {
      summary: 'List jobs bookmarked by the current user',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(ctx.query as z.infer<typeof PageOnlyQuerySchema>);
      return bc.listBookmarkedJobs.execute(ctx.user!.userId, page, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/recommended',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PageOnlyQuerySchema,
    openapi: {
      summary: 'List jobs recommended for the current user based on resume skills',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(ctx.query as z.infer<typeof PageOnlyQuerySchema>);
      return bc.listRecommendedJobs.execute(ctx.user!.userId, page, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/applications',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PageOnlyQuerySchema,
    openapi: {
      summary: 'List active applications submitted by the current user',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(ctx.query as z.infer<typeof PageOnlyQuerySchema>);
      return bc.listMyApplications.execute(ctx.user!.userId, page, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/:id/applications',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    params: IdParam,
    query: PageOnlyQuerySchema,
    openapi: {
      summary: 'List applications received for a job (job owner only)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const { page, limit } = pageOnly(ctx.query as z.infer<typeof PageOnlyQuerySchema>);
      return bc.listJobApplications.execute(id, ctx.user!.userId, page, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/:id/similar',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    query: SimilarQuerySchema,
    openapi: {
      summary: 'Jobs similar to the given one (by skill overlap)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const q = ctx.query as z.infer<typeof SimilarQuerySchema>;
      const limit = Math.min(Math.max(num(q.limit, 5), 1), 10);
      return bc.findSimilarJobs.execute(id, ctx.user!.userId, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/:id',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    openapi: {
      summary: 'Fetch a single job by id',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.getJob.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/:id/fit',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    openapi: {
      summary: "Fit score breakdown for this job against the viewer's primary resume",
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.getJobFit.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/:id/bookmark',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    openapi: { summary: 'Bookmark a job', tags: ['jobs'], description: 'Jobs API' },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.bookmarkJob.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'DELETE',
    path: '/v1/jobs/:id/bookmark',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    openapi: { summary: 'Remove a job bookmark', tags: ['jobs'], description: 'Jobs API' },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.unbookmarkJob.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/:id/apply',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    body: ApplyToJobSchema,
    openapi: {
      summary: 'Submit a quick application to a job',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.applyToJob.execute(
        id,
        ctx.user!.userId,
        (ctx.body as Parameters<typeof bc.applyToJob.execute>[2]) ?? {},
      );
    },
  },
  {
    method: 'DELETE',
    path: '/v1/jobs/:id/apply',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    openapi: {
      summary: 'Withdraw the current user application to a job',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.withdrawApplication.execute(id, ctx.user!.userId);
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    body: CreateJobSchema,
    openapi: {
      summary: 'Create a new job posting',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      return bc.createJob.execute(
        ctx.user!.userId,
        ctx.body as Parameters<typeof bc.createJob.execute>[1],
      );
    },
  },
  {
    method: 'PATCH',
    path: '/v1/jobs/:id',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    params: IdParam,
    body: UpdateJobSchema,
    openapi: {
      summary: 'Update a job posting',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.updateJob.execute(
        id,
        ctx.user!.userId,
        ctx.body as Parameters<typeof bc.updateJob.execute>[2],
      );
    },
  },
  {
    method: 'DELETE',
    path: '/v1/jobs/:id',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    params: IdParam,
    openapi: {
      summary: 'Delete a job posting',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      return bc.deleteJob.execute(id, ctx.user!.userId);
    },
  },

  // ─── Application tracker ──────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/jobs/applications/tracker',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: TrackerQuerySchema,
    openapi: {
      summary:
        'Full application timeline for the viewer (enviada → visualizada → entrevista → oferta/silêncio).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = ctx.query as z.infer<typeof TrackerQuerySchema>;
      const threshold = q.silentDays ? Math.max(1, Number(q.silentDays)) : 10;
      const applications = await bc.listApplicationTimeline.execute(ctx.user!.userId, threshold);
      return { success: true, data: { applications } };
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/applications/:applicationId/events',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: ApplicationIdParam,
    body: RecordApplicationEventSchema,
    openapi: {
      summary:
        'Record a timeline event on an application (viewed, interview scheduled, offer, etc.).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { applicationId } = ctx.params as { applicationId: string };
      const body = ctx.body as z.infer<typeof RecordApplicationEventSchema>;
      const event = await bc.recordApplicationEvent.execute({
        applicationId,
        userId: ctx.user!.userId,
        type: body.type,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
        note: body.note,
      });
      return { success: true, data: event };
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/applications/companies/:company/response-stats',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: CompanyParam,
    openapi: {
      summary: 'Per-company response percentiles (p50/p90 days to first response).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { company } = ctx.params as { company: string };
      const data = await bc.getCompanyResponseStats.execute(company);
      return { success: true, data };
    },
  },
];
