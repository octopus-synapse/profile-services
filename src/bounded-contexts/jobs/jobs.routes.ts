/**
 * Route descriptors for the jobs BC. Replaces `JobController` and
 * `ApplicationTrackerController` — including the rate-limited
 * `POST /v1/jobs/import-from-url` route, which now declares its
 * `@UseGuards(RateLimitGuard)` requirement via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`. The BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import type { EnglishLevel, JobType } from '@prisma/client';
import { z } from 'zod';
import { RATE_LIMIT_KEY } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.metadata';
import { Permission } from '@/shared-kernel/authorization';
import type { Route } from '@/shared-kernel/http/route';
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import { JobsUseCases } from './application/ports/jobs.port';
import { RecordApplicationEventSchema } from './dto/application-event.schema';
import {
  ApplyToJobSchema,
  CreateJobSchema,
  ImportJobFromUrlSchema,
  UpdateJobSchema,
} from './dto/job.schema';
import {
  parsePaymentCurrencies,
  parseRemotePolicies,
  parseSkillsCsv,
} from './presenters/job.presenter';

export { RATE_LIMIT_KEY };

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

const FitDimensionSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  target: z.number(),
  color: z.string(),
  hint: z.string(),
  weight: z.number(),
});

const JobFitResponseSchema = z.object({
  score: z.number(),
  dimensions: z.array(FitDimensionSchema),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
});

const ApplyRequirementSchema = z.object({
  type: z.string(),
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  maxLength: z.number().int().optional(),
  options: z.array(z.string()).optional(),
});

const ApplyBlockerSchema = z.object({
  code: z.string(),
  message: z.string(),
});

const ApplyContextResponseSchema = z.object({
  defaults: z.object({
    coverLetter: z.string(),
    resumeId: z.string().nullable(),
  }),
  requirements: z.array(ApplyRequirementSchema),
  cta: z.object({
    label: z.string(),
    endpoint: z.object({ method: z.string(), path: z.string() }),
  }),
  oneClickAvailable: z.boolean(),
  blockers: z.array(ApplyBlockerSchema).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
const JobTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']);
const RemotePolicyEnum = z.enum(['REMOTE', 'HYBRID', 'ONSITE']);
const PaymentCurrencyEnum = z.enum(['BRL', 'USD', 'EUR', 'GBP']);
const EnglishLevelEnum = z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT']);
const JobApplicationStatusEnum = z.enum([
  'SUBMITTED',
  'VIEWED',
  'REJECTED',
  'ACCEPTED',
  'WITHDRAWN',
]);
const JobApplicationEventTypeEnum = z.enum([
  'SUBMITTED',
  'VIEWED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER_RECEIVED',
  'REJECTED',
  'WITHDRAWN',
  'FOLLOW_UP_SENT',
]);

const JobAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

const JobSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  jobType: JobTypeEnum,
  description: z.string(),
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
  salaryRange: z.string().nullable(),
  applyUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  paymentCurrency: PaymentCurrencyEnum.nullable(),
  remotePolicy: RemotePolicyEnum.nullable(),
  minEnglishLevel: EnglishLevelEnum.nullable(),
});

// Job + denormalized author + viewer-relative flags (the "decorated"
// shape returned by every listing endpoint).
const JobWithAuthorSchema = JobSchema.extend({
  author: JobAuthorSchema.nullable().optional(),
});

const JobViewSchema = JobWithAuthorSchema.extend({
  isBookmarked: z.boolean().optional(),
  hasApplied: z.boolean().optional(),
});

const FitScoreBreakdownSchema = z.object({
  skillOverlap: z.number(),
  englishMatch: z.number(),
  remoteMatch: z.number(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

const FitScoreSchema = z.object({
  score: z.number(),
  breakdown: FitScoreBreakdownSchema,
});

const JobWithFitScoreSchema = JobViewSchema.extend({
  fitScore: FitScoreSchema.nullable(),
});

const JobsListResponseSchema = PaginatedResponseSchema(JobViewSchema);
const JobsListWithFitScoreResponseSchema = PaginatedResponseSchema(JobWithFitScoreSchema);
const MyJobsListResponseSchema = PaginatedResponseSchema(JobSchema);

// Legacy `{ data, total, page, limit, totalPages }` shape — preserved
// because the underlying use case still emits it (not yet migrated to
// the canonical `{ items, ..., hasNext, hasPrev }` paginator).
const LegacyPaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().min(0),
  });

const BookmarkedJobItemSchema = JobWithAuthorSchema.extend({
  bookmarkedAt: z.string().datetime(),
});

const BookmarkedJobsResponseSchema = LegacyPaginatedSchema(BookmarkedJobItemSchema);

const RecommendedJobItemSchema = JobViewSchema.extend({ matchScore: z.number() });
const RecommendedJobsResponseSchema = LegacyPaginatedSchema(RecommendedJobItemSchema);

// `listMyApplications` returns `data: ApplicationWithJob[]` (typed
// `unknown[]` in the use case but emitted as application + denormalized
// job/author). Models the actual JSON shape the repository projects.
const JobApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  userId: z.string(),
  status: JobApplicationStatusEnum,
  coverLetter: z.string().nullable(),
  resumeId: z.string().nullable(),
  tailoredVersionId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const ApplicationWithJobSchema = JobApplicationSchema.extend({
  job: JobWithAuthorSchema,
});

const MyApplicationsResponseSchema = LegacyPaginatedSchema(ApplicationWithJobSchema);

// Employer-side: list of applications received on a job. The use case
// projects each row into `{...applicationListItem, user: candidate | null}`.
const ApplicationCandidateSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string(),
  photoURL: z.string().nullable(),
});

const JobApplicationListItemSchema = z.object({
  id: z.string(),
  status: JobApplicationStatusEnum,
  createdAt: z.string().datetime(),
  coverLetter: z.string().nullable(),
  resumeId: z.string().nullable(),
  tailoredVersionId: z.string().nullable(),
  user: ApplicationCandidateSchema.nullable(),
});

const JobApplicationsResponseSchema = z.object({
  items: z.array(JobApplicationListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

const SimilarJobItemSchema = JobViewSchema.extend({ skillOverlap: z.number() });
const SimilarJobsResponseSchema = z.object({
  items: z.array(SimilarJobItemSchema),
});

const BookmarkResponseSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  alreadyBookmarked: z.boolean(),
});

const UnbookmarkResponseSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  removed: z.literal(true),
});

const ApplyToJobResponseSchema = JobApplicationSchema.extend({
  alreadyApplied: z.boolean(),
});

const WithdrawApplicationResponseSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  withdrawn: z.literal(true),
});

const TimelineEventSchema = z.object({
  id: z.string(),
  type: JobApplicationEventTypeEnum,
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

const TrackedApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  status: z.string(),
  appliedAt: z.string().datetime(),
  job: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    location: z.string().nullable(),
  }),
  events: z.array(TimelineEventSchema),
  daysSinceLastResponse: z.number().int().nullable(),
  needsFollowUp: z.boolean(),
});

const ApplicationsTimelineResponseSchema = z.object({
  applications: z.array(TrackedApplicationSchema),
});

const RecordApplicationEventResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

const CompanyResponseStatsResponseSchema = z.object({
  company: z.string(),
  sampleSize: z.number().int().min(0),
  p50Days: z.number().int().nullable(),
  p90Days: z.number().int().nullable(),
  responseRate: z.number().min(0).max(1),
});

const ExtractedJobSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
  salaryRange: z.string().nullable(),
  applyUrl: z.string().nullable(),
  jobType: JobTypeEnum.nullable(),
  remotePolicy: RemotePolicyEnum.nullable(),
  paymentCurrency: PaymentCurrencyEnum.nullable(),
  minEnglishLevel: EnglishLevelEnum.nullable(),
});

const ImportJobFromUrlResponseSchema = z.object({
  source: z.string(),
  preview: ExtractedJobSchema,
});

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
    response: JobsListResponseSchema,
    openapi: { summary: 'List paginated job postings', tags: ['jobs'], description: 'Jobs API' },
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
    response: JobsListWithFitScoreResponseSchema,
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
    response: MyJobsListResponseSchema,
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
    response: BookmarkedJobsResponseSchema,
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
    response: RecommendedJobsResponseSchema,
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
    response: MyApplicationsResponseSchema,
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
    response: JobApplicationsResponseSchema,
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
    response: SimilarJobsResponseSchema,
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
    params: IdParam,
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
      const q = ctx.query as z.infer<typeof TrackerQuerySchema>;
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
