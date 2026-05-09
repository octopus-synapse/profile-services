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
import { RecordApplicationEventSchema } from './dto/application-event.schema';
import {
  ApplyToJobSchema,
  CreateJobSchema,
  ImportJobFromUrlSchema,
  UpdateJobSchema,
} from './dto/job.schema';
import {
  ApplicationIdParam,
  ApplicationsTimelineResponseSchema,
  ApplyContextResponseSchema,
  ApplyToJobResponseSchema,
  BookmarkedJobsResponseSchema,
  BookmarkResponseSchema,
  buildJobListInput,
  CompanyParam,
  CompanyResponseStatsResponseSchema,
  IdParam,
  ImportJobFromUrlResponseSchema,
  JobApplicationsResponseSchema,
  JobFitResponseSchema,
  JobListQuerySchema,
  JobSchema,
  JobsListResponseSchema,
  JobsListWithFitScoreResponseSchema,
  JobViewSchema,
  MyApplicationsResponseSchema,
  MyJobsListResponseSchema,
  PageOnlyQuerySchema,
  pageOnly,
  RecommendedJobsResponseSchema,
  RecordApplicationEventResponseSchema,
  SimilarJobsResponseSchema,
  SimilarQuerySchema,
  TrackerQuerySchema,
  UnbookmarkResponseSchema,
  WithdrawApplicationResponseSchema,
} from './jobs.routes.schemas';

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
    path: '/v1/jobs/with-fit-score',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: JobListQuerySchema,
    response: JobsListWithFitScoreResponseSchema,
    openapi: {
      summary:
        'Same as GET /jobs but each item is enriched with a 0-100 structured fit score for the current user.',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = JobListQuerySchema.parse(ctx.query);
      return bc.listJobsWithFitScore.execute(buildJobListInput(q), ctx.user!.userId);
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
      return bc.listRecommendedJobs.execute(ctx.user!.userId, page, limit);
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
    path: '/v1/jobs/:id/fit',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: IdParam,
    response: JobFitResponseSchema,
    openapi: {
      summary: "Fit score breakdown for this job against the viewer's primary resume",
      tags: ['jobs'],
      description:
        'Returns `{score, dimensions:[{key,label,value,target,color,hint,weight}], matchedKeywords?, missingKeywords?}` so the frontend renders bars/cards by iterating dimensions[] without per-key mapping.',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { id } = ctx.params as { id: string };
      const raw = (await bc.getJobFit.execute(id, ctx.user!.userId)) as Record<string, unknown>;
      const score = Number(raw.score ?? raw.matchScore ?? 0);
      const legacy = (raw.dimensions ?? {}) as { hardSkills?: number; softSkills?: number };
      const hardSkills = Number(legacy.hardSkills ?? 0);
      const softSkills = Number(legacy.softSkills ?? 0);
      const dimensions = [
        {
          key: 'hardSkills' as const,
          label: 'Habilidades técnicas',
          value: hardSkills,
          target: 100,
          color: hardSkills >= 70 ? 'green' : hardSkills >= 40 ? 'amber' : 'red',
          hint:
            hardSkills >= 70
              ? 'Excelente alinhamento técnico'
              : hardSkills >= 40
                ? 'Cobertura técnica parcial'
                : 'Faltam habilidades-chave',
          weight: 0.6,
        },
        {
          key: 'softSkills' as const,
          label: 'Habilidades comportamentais',
          value: softSkills,
          target: 100,
          color: softSkills >= 60 ? 'green' : softSkills >= 30 ? 'amber' : 'red',
          hint:
            softSkills >= 60
              ? 'Sinais comportamentais alinhados'
              : softSkills >= 30
                ? 'Sinais comportamentais parciais'
                : 'Poucos sinais comportamentais detectados',
          weight: 0.4,
        },
      ];
      return {
        score,
        dimensions,
        matchedKeywords: (raw.matchedKeywords as string[] | undefined) ?? [],
        missingKeywords: (raw.missingKeywords as string[] | undefined) ?? [],
      };
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
        bc as unknown as {
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

  // ─── Application tracker ──────────────────────────────────────────
  {
    method: 'GET',
    path: '/v1/jobs/applications/tracker',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    query: TrackerQuerySchema,
    response: ApplicationsTimelineResponseSchema,
    openapi: {
      summary:
        'Full application timeline for the viewer (enviada → visualizada → entrevista → oferta/silêncio).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const q = TrackerQuerySchema.parse(ctx.query);
      const threshold = q.silentDays ? Math.max(1, Number(q.silentDays)) : 10;
      const applications = await bc.listApplicationTimeline.execute(ctx.user!.userId, threshold);
      return { applications };
    },
  },
  {
    method: 'POST',
    path: '/v1/jobs/applications/:applicationId/events',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: ApplicationIdParam,
    body: RecordApplicationEventSchema,
    response: RecordApplicationEventResponseSchema,
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
      return event;
    },
  },
  {
    method: 'GET',
    path: '/v1/jobs/applications/companies/:company/response-stats',
    auth: { kind: 'jwt' },
    permission: Permission.FEED_USE,
    params: CompanyParam,
    response: CompanyResponseStatsResponseSchema,
    openapi: {
      summary: 'Per-company response percentiles (p50/p90 days to first response).',
      tags: ['application-tracker'],
      description: 'Timeline + silence detection for job applications',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const { company } = ctx.params as { company: string };
      return bc.getCompanyResponseStats.execute(company);
    },
  },

  // ─── URL import (rate-limited) ────────────────────────────────────
  {
    method: 'POST',
    path: '/v1/jobs/import-from-url',
    auth: { kind: 'jwt' },
    permission: Permission.JOB_CREATE,
    body: ImportJobFromUrlSchema,
    statusCode: 200,
    response: ImportJobFromUrlResponseSchema,
    guards: [
      {
        id: 'rate-limit',
        metadata: { points: 5, duration: 600, keyStrategy: 'user' },
      },
      { id: 'external-api' },
    ],
    openapi: {
      summary: 'Fetch a careers page and return an LLM-extracted job preview (not persisted)',
      tags: ['jobs'],
      description: 'Jobs API',
    },
    sdk: { exported: true },
    handler: async (ctx, bc) => {
      const body = ctx.body as { url: string };
      return bc.importJobFromUrl.execute(body.url);
    },
  },
];
