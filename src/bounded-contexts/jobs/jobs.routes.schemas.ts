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
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import {
  parsePaymentCurrencies,
  parseRemotePolicies,
  parseSkillsCsv,
} from './presenters/job.presenter';

export { RATE_LIMIT_KEY };

export const IdParam = z.object({ id: z.string() });
export const ApplicationIdParam = z.object({ applicationId: z.string() });
export const CompanyParam = z.object({ company: z.string() });

export const JobListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().max(500).optional(),
  jobType: z.string().optional(),
  skills: z.string().max(500).optional(),
  paymentCurrency: z.string().max(100).optional(),
  remotePolicy: z.string().max(100).optional(),
  minEnglishLevel: z.string().optional(),
});

export const PageOnlyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const SimilarQuerySchema = z.object({ limit: z.string().optional() });

export const TrackerQuerySchema = z.object({ silentDays: z.string().optional() });

export const FitDimensionSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  target: z.number(),
  color: z.string(),
  hint: z.string(),
  weight: z.number(),
});

export const JobFitResponseSchema = z.object({
  score: z.number(),
  dimensions: z.array(FitDimensionSchema),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
});

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
export const JobTypeEnum = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
]);
export const RemotePolicyEnum = z.enum(['REMOTE', 'HYBRID', 'ONSITE']);
export const PaymentCurrencyEnum = z.enum(['BRL', 'USD', 'EUR', 'GBP']);
export const EnglishLevelEnum = z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FLUENT']);
export const JobApplicationStatusEnum = z.enum([
  'SUBMITTED',
  'VIEWED',
  'REJECTED',
  'ACCEPTED',
  'WITHDRAWN',
]);
export const JobApplicationEventTypeEnum = z.enum([
  'SUBMITTED',
  'VIEWED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'OFFER_RECEIVED',
  'REJECTED',
  'WITHDRAWN',
  'FOLLOW_UP_SENT',
]);

export const JobAuthorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const JobSchema = z.object({
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
export const JobWithAuthorSchema = JobSchema.extend({
  author: JobAuthorSchema.nullable().optional(),
});

export const JobViewSchema = JobWithAuthorSchema.extend({
  isBookmarked: z.boolean().optional(),
  hasApplied: z.boolean().optional(),
});

export const FitScoreBreakdownSchema = z.object({
  skillOverlap: z.number(),
  englishMatch: z.number(),
  remoteMatch: z.number(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

export const FitScoreSchema = z.object({
  score: z.number(),
  breakdown: FitScoreBreakdownSchema,
});

export const JobWithFitScoreSchema = JobViewSchema.extend({
  fitScore: FitScoreSchema.nullable(),
});

export const JobsListResponseSchema = PaginatedResponseSchema(JobViewSchema);
export const JobsListWithFitScoreResponseSchema = PaginatedResponseSchema(JobWithFitScoreSchema);
export const MyJobsListResponseSchema = PaginatedResponseSchema(JobSchema);

// Legacy `{ data, total, page, limit, totalPages }` shape — preserved
// because the underlying use case still emits it (not yet migrated to
// the canonical `{ items, ..., hasNext, hasPrev }` paginator).
export const LegacyPaginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().min(0),
  });

export const BookmarkedJobItemSchema = JobWithAuthorSchema.extend({
  bookmarkedAt: z.string().datetime(),
});

export const BookmarkedJobsResponseSchema = LegacyPaginatedSchema(BookmarkedJobItemSchema);

export const RecommendedJobItemSchema = JobViewSchema.extend({ matchScore: z.number() });
export const RecommendedJobsResponseSchema = LegacyPaginatedSchema(RecommendedJobItemSchema);

// `listMyApplications` returns `data: ApplicationWithJob[]` (typed
// `unknown[]` in the use case but emitted as application + denormalized
// job/author). Models the actual JSON shape the repository projects.
export const JobApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  userId: z.string(),
  status: JobApplicationStatusEnum,
  coverLetter: z.string().nullable(),
  resumeId: z.string().nullable(),
  tailoredVersionId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const ApplicationWithJobSchema = JobApplicationSchema.extend({
  job: JobWithAuthorSchema,
});

export const MyApplicationsResponseSchema = LegacyPaginatedSchema(ApplicationWithJobSchema);

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
  createdAt: z.string().datetime(),
  coverLetter: z.string().nullable(),
  resumeId: z.string().nullable(),
  tailoredVersionId: z.string().nullable(),
  user: ApplicationCandidateSchema.nullable(),
});

export const JobApplicationsResponseSchema = z.object({
  items: z.array(JobApplicationListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

export const SimilarJobItemSchema = JobViewSchema.extend({ skillOverlap: z.number() });
export const SimilarJobsResponseSchema = z.object({
  items: z.array(SimilarJobItemSchema),
});

export const BookmarkResponseSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  alreadyBookmarked: z.boolean(),
});

export const UnbookmarkResponseSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  removed: z.literal(true),
});

export const ApplyToJobResponseSchema = JobApplicationSchema.extend({
  alreadyApplied: z.boolean(),
});

export const WithdrawApplicationResponseSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  withdrawn: z.literal(true),
});

export const TimelineEventSchema = z.object({
  id: z.string(),
  type: JobApplicationEventTypeEnum,
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
});

export const TrackedApplicationSchema = z.object({
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

export const ApplicationsTimelineResponseSchema = z.object({
  applications: z.array(TrackedApplicationSchema),
});

export const RecordApplicationEventResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
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

export function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildJobListInput(q: z.infer<typeof JobListQuerySchema>) {
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

export function pageOnly(q: z.infer<typeof PageOnlyQuerySchema>): { page: number; limit: number } {
  return {
    page: Math.min(Math.max(num(q.page, 1), 1), 1000),
    limit: Math.min(Math.max(num(q.limit, 20), 1), 100),
  };
}
