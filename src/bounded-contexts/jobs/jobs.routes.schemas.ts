/**
 * Route descriptors for the jobs BC. Replaces `JobController` and
 * `ApplicationTrackerController` — including the rate-limited
 * `POST /v1/jobs/import-from-url` route, which now declares its
 * `@UseGuards(RateLimitGuard)` requirement via
 * `Route.guards: [{ id: 'rate-limit', metadata: {...} }]`. The BC's
 * module wires `RateLimitGuard` into the synthesizer's guard registry.
 */

import {
  EnglishLevel,
  JobApplicationEventType,
  JobApplicationStatus,
  type JobType,
  JobType as JobTypeEnumValues,
  PaymentCurrency,
  RemotePolicy,
} from '@prisma/client';
import { z } from 'zod';
import { RATE_LIMIT_KEY } from '@/bounded-contexts/platform/common/rate-limit/rate-limit.metadata';
import {
  PaginatedResponseSchema,
  PaginationQuerySchema,
} from '@/shared-kernel/schemas/common/api.types';
import { makePaginationSchema } from '@/shared-kernel/schemas/common/pagination.factory';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { ExternalJobItemSchema } from './external-jobs.routes.schemas';
import {
  parsePaymentCurrencies,
  parseRemotePolicies,
  parseSkillsCsv,
} from './presenters/job.presenter';

export { RATE_LIMIT_KEY };

export const IdParam = IdParamSchema;
export const ApplicationIdParam = z.object({ applicationId: z.string().uuid() });
export const CompanyParam = z.object({ company: z.string() });

// P1 #34 — sortBy is locked to a literal allowlist via the factory so
// requests with an arbitrary column get a 400 before the use case runs.
export const JobListSortFields = ['createdAt', 'updatedAt', 'salaryMin', 'salaryMax'] as const;

export const JobListQuerySchema = makePaginationSchema(JobListSortFields).extend({
  search: z.string().max(500).optional(),
  jobType: z.string().optional(),
  skills: z.string().max(500).optional(),
  paymentCurrency: z.string().max(100).optional(),
  remotePolicy: z.string().max(100).optional(),
  minEnglishLevel: z.string().optional(),
});

export const PageOnlyQuerySchema = PaginationQuerySchema;

export const SimilarQuerySchema = z.object({ limit: z.coerce.number().int().min(1).optional() });

export const TrackerQuerySchema = z.object({ silentDays: z.string().optional() });

export const ApplyRequirementSchema = z.object({
  type: z.string(),
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  maxLength: z.number().int().optional(),
  options: z.array(z.string()).optional(),
});

export const ApplyBlockerSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const ApplyContextResponseSchema = z.object({
  defaults: z.object({
    coverLetter: z.string(),
    resumeId: z.string().uuid().nullable(),
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
export const JobTypeEnum = z.nativeEnum(JobTypeEnumValues);
export const RemotePolicyEnum = z.nativeEnum(RemotePolicy);
export const PaymentCurrencyEnum = z.nativeEnum(PaymentCurrency);
export const EnglishLevelEnum = z.nativeEnum(EnglishLevel);
export const JobApplicationStatusEnum = z.nativeEnum(JobApplicationStatus);
export const JobApplicationEventTypeEnum = z.nativeEnum(JobApplicationEventType);

export const JobAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const JobSchema = z.object({
  id: z.string(),
  authorId: z.string().uuid(),
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
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema.nullable(),
  paymentCurrency: PaymentCurrencyEnum.nullable(),
  remotePolicy: RemotePolicyEnum.nullable(),
  minEnglishLevel: EnglishLevelEnum.nullable(),
  requirementsStructured: z.unknown().nullable(),
  requirementsEnrichedByAi: z.unknown().nullable(),
  enrichedAt: IsoDateTimeSchema.nullable(),
  enrichedBy: z.string().nullable(),
  culturalProfileCaptured: z.boolean(),
});

// Job + denormalized author + viewer-relative flags (the "decorated"
// shape returned by every listing endpoint).
export const JobWithAuthorSchema = JobSchema.extend({
  author: JobAuthorSchema.nullable().optional(),
});

export const JobViewSchema = JobWithAuthorSchema.extend({
  isBookmarked: z.boolean().optional(),
  hasApplied: z.boolean().optional(),
});

export const JobsListResponseSchema = PaginatedResponseSchema(JobViewSchema);
export const MyJobsListResponseSchema = PaginatedResponseSchema(JobSchema);

export const BookmarkedJobItemSchema = JobWithAuthorSchema.extend({
  bookmarkedAt: IsoDateTimeSchema,
});

export const BookmarkedJobsResponseSchema = PaginatedResponseSchema(BookmarkedJobItemSchema);

// Recommended = external (JSearch) listings ranked by the Match Score
// (precomputed by the job-match worker), so the item is the external shape
// + a 0–100 `matchScore`.
export const RecommendedJobItemSchema = ExternalJobItemSchema.extend({ matchScore: z.number() });
export const RecommendedJobsResponseSchema = PaginatedResponseSchema(RecommendedJobItemSchema);

// `listMyApplications` returns `data: ApplicationWithJob[]` (typed
// `unknown[]` in the use case but emitted as application + denormalized
// job/author). Models the actual JSON shape the repository projects.
export const JobApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  status: JobApplicationStatusEnum,
  coverLetter: z.string().nullable(),
  resumeId: z.string().uuid().nullable(),
  tailoredVersionId: z.string().uuid().nullable(),
  /** Match Score frozen at apply time (0-100); null when not computable. */
  matchScoreSnapshot: z.number().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const ApplicationWithJobSchema = JobApplicationSchema.extend({
  job: JobWithAuthorSchema,
});

export const MyApplicationsResponseSchema = PaginatedResponseSchema(ApplicationWithJobSchema);

// Employer-side: list of applications received on a job. The use case
// projects each row into `{...applicationListItem, user: candidate | null}`.
export const ApplicationCandidateSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string(),
  photoURL: z.string().nullable(),
});

export const JobApplicationListItemSchema = z.object({
  id: z.string(),
  status: JobApplicationStatusEnum,
  createdAt: IsoDateTimeSchema,
  coverLetter: z.string().nullable(),
  resumeId: z.string().uuid().nullable(),
  tailoredVersionId: z.string().uuid().nullable(),
  user: ApplicationCandidateSchema.nullable(),
});

export const JobApplicationsResponseSchema = PaginatedResponseSchema(JobApplicationListItemSchema);

export const SimilarJobItemSchema = JobViewSchema.extend({ skillOverlap: z.number() });
export const SimilarJobsResponseSchema = z.object({
  items: z.array(SimilarJobItemSchema),
});

export const BookmarkResponseSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  alreadyBookmarked: z.boolean(),
});

export const UnbookmarkResponseSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  removed: z.literal(true),
});

export const ApplyToJobResponseSchema = JobApplicationSchema.extend({
  alreadyApplied: z.boolean(),
});

export const WithdrawApplicationResponseSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  withdrawn: z.literal(true),
});

export const TimelineEventSchema = z.object({
  id: z.string(),
  type: JobApplicationEventTypeEnum,
  note: z.string().nullable(),
  occurredAt: IsoDateTimeSchema,
});

export const TrackedApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string().uuid(),
  status: z.string(),
  appliedAt: IsoDateTimeSchema,
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

export const ApplicationsTimelineResponseSchema = z.object({
  applications: z.array(TrackedApplicationSchema),
});

export const RecordApplicationEventResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  note: z.string().nullable(),
  occurredAt: IsoDateTimeSchema,
});

export const CompanyResponseStatsResponseSchema = z.object({
  company: z.string(),
  sampleSize: z.number().int().min(0),
  p50Days: z.number().int().nullable(),
  p90Days: z.number().int().nullable(),
  responseRate: z.number().min(0).max(1),
});

export const ExtractedJobSchema = z.object({
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

export const ImportJobFromUrlResponseSchema = z.object({
  source: z.string(),
  preview: ExtractedJobSchema,
});

export function buildJobListInput(q: z.infer<typeof JobListQuerySchema>) {
  return {
    page: q.page,
    limit: q.limit,
    search: q.search,
    jobType: q.jobType as JobType | undefined,
    skills: parseSkillsCsv(q.skills),
    paymentCurrency: parsePaymentCurrencies(q.paymentCurrency),
    remotePolicy: parseRemotePolicies(q.remotePolicy),
    minEnglishLevel: q.minEnglishLevel as EnglishLevel | undefined,
  };
}

export function pageOnly(q: z.infer<typeof PageOnlyQuerySchema>): { page: number; limit: number } {
  return { page: q.page, limit: q.limit };
}
