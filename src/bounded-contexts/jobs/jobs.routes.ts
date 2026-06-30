/**
 * Route descriptors for the jobs BC. Replaces `JobController` and
 * `ApplicationTrackerController` — including the rate-limited
 * `POST /v1/jobs/import-from-url` route, which now declares its
 * `@UseGuards(RateLimitGuard)` requirement via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`. The BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import { z } from 'zod';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route.types';
import { JobsUseCases } from './application/ports/jobs.port';
import { ApplyToJobSchema, CreateJobSchema, UpdateJobSchema } from './dto/job.schema';
import {
  ApplyContextResponseSchema,
  ApplyToJobResponseSchema,
  BookmarkedJobsResponseSchema,
  BookmarkResponseSchema,
  buildJobListInput,
  IdParam,
  JobApplicationsResponseSchema,
  JobListQuerySchema,
  JobSchema,
  JobsListResponseSchema,
  JobViewSchema,
  MyApplicationsResponseSchema,
  MyJobsListResponseSchema,
  PageOnlyQuerySchema,
  pageOnly,
  RecommendedJobsResponseSchema,
  SimilarJobsResponseSchema,
  SimilarQuerySchema,
  UnbookmarkResponseSchema,
  WithdrawApplicationResponseSchema,
} from './jobs.routes.schemas';
import { toRecommendedExternalJobResponseDto } from './presenters/external-job.presenter';

export const jobsRoutes: ReadonlyArray<Route<JobsUseCases>> = [
  // ─── Catalog ──────────────────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/jobs',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: JobListQuerySchema,
    response: JobsListResponseSchema,
    openapi: { summary: 'List paginated job postings', tags: ['jobs'], description: 'Jobs API' },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = JobListQuerySchema.parse(ctx.query);
      return bc.listJobs.execute(buildJobListInput(q), ctx.user!.userId);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/mine',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    query: PageOnlyQuerySchema,
    response: MyJobsListResponseSchema,
    openapi: {
      summary: 'List jobs the current user (recruiter) authored',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(PageOnlyQuerySchema.parse(ctx.query));
      return bc.listMyJobs.execute(ctx.user!.userId, page, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/bookmarks',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PageOnlyQuerySchema,
    response: BookmarkedJobsResponseSchema,
    openapi: {
      summary: 'List jobs bookmarked by the current user',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(PageOnlyQuerySchema.parse(ctx.query));
      return bc.listBookmarkedJobs.execute(ctx.user!.userId, page, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/recommended',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PageOnlyQuerySchema,
    response: RecommendedJobsResponseSchema,
    openapi: {
      summary: 'List jobs recommended for the current user based on resume skills',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(PageOnlyQuerySchema.parse(ctx.query));
      const result = await bc.listRecommendedJobs.execute(ctx.user!.userId, page, limit);
      return { ...result, items: result.items.map(toRecommendedExternalJobResponseDto) };
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/applications',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: PageOnlyQuerySchema,
    response: MyApplicationsResponseSchema,
    openapi: {
      summary: 'List active applications submitted by the current user',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { page, limit } = pageOnly(PageOnlyQuerySchema.parse(ctx.query));
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
    response: JobApplicationsResponseSchema,
    openapi: {
      summary: 'List applications received for a job (job owner only)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const { page, limit } = pageOnly(PageOnlyQuerySchema.parse(ctx.query));
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
    response: SimilarJobsResponseSchema,
    openapi: {
      summary: 'Jobs similar to the given one (by skill overlap)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const q = SimilarQuerySchema.parse(ctx.query);
      const requested = q.limit ? Number(q.limit) : 5;
      const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 10) : 5;
      return bc.findSimilarJobs.execute(id, ctx.user!.userId, limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/:id',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: JobViewSchema,
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
    path: '/v1/jobs/:id/apply-context',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: ApplyContextResponseSchema,
    openapi: {
      summary: 'Apply-context: defaults + requirements + blockers for the apply modal',
      tags: ['jobs'],
      description:
        'Returns `{defaults:{coverLetter,resumeId},requirements:[{type,key,label,required,options?}],cta,oneClickAvailable,blockers?:[{code,message,suggestedAction?}]}` so the frontend renders the apply modal entirely server-driven.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      // Touch the job to ensure it exists + permissioned for the viewer.
      await bc.getJob.execute(id, ctx.user!.userId);

      // Resume suggestion: pull the viewer's primary resume id from the
      // jobs repository helper (`getPrimaryResumeId`). The full payload
      // stays small — frontend renders the picker if needed.
      const repository = (
        bc as {
          repository?: { getPrimaryResumeId?: (uid: string) => Promise<string | null> };
        }
      ).repository;
      const suggestedResumeId = repository?.getPrimaryResumeId
        ? await repository.getPrimaryResumeId(ctx.user!.userId)
        : null;

      const blockers: Array<{ code: string; message: string }> = [];
      if (!suggestedResumeId) {
        blockers.push({
          code: 'NO_PRIMARY_RESUME',
          message: 'Você precisa de um currículo antes de aplicar.',
        });
      }

      return {
        defaults: {
          coverLetter: '',
          resumeId: suggestedResumeId ?? null,
        },
        requirements: [
          {
            type: 'longtext' as const,
            key: 'coverLetter',
            label: 'Carta de apresentação',
            required: false,
            maxLength: 4000,
          },
          {
            type: 'resume-picker' as const,
            key: 'resumeId',
            label: 'Currículo',
            required: true,
          },
        ],
        cta: {
          label: 'Enviar candidatura',
          endpoint: { method: 'POST', path: `/v1/jobs/${id}/apply` },
        },
        oneClickAvailable: !!suggestedResumeId,
        blockers: blockers.length > 0 ? blockers : undefined,
      };
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/:id/bookmark',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: BookmarkResponseSchema,
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
    response: UnbookmarkResponseSchema,
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
    params: z
      .object({ id: z.string().uuid('ID must be a valid UUID') })
      .openapi({ example: { id: '01900000-0000-7000-a000-000000000031' } }),
    body: ApplyToJobSchema,
    response: ApplyToJobResponseSchema,
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
    response: WithdrawApplicationResponseSchema,
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
    response: JobSchema,
    responseHeaders: z.object({
      Location: z
        .string()
        .optional()
        .openapi({ example: '/api/v1/jobs/01900000-0000-7000-a000-000000000030' }),
    }),
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
    response: JobSchema,
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
    response: JobSchema,
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
];
