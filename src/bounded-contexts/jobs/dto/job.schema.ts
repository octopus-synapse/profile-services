import { EnglishLevel, JobType, PaymentCurrency, RemotePolicy } from '@prisma/client';
import { z } from 'zod';

// Use the Prisma enum values as the source of truth so the DTO type matches
// what the JobService methods expect (avoids structural mismatch on string vs
// enum literal — Prisma generates string-literal enums but `nominal` typed).
const JobTypeEnum = z.nativeEnum(JobType);
const RemotePolicyEnum = z.nativeEnum(RemotePolicy);
const PaymentCurrencyEnum = z.nativeEnum(PaymentCurrency);
const EnglishLevelEnum = z.nativeEnum(EnglishLevel);

// ============================================================================
// Create job
// ============================================================================
export const CreateJobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  jobType: JobTypeEnum,
  description: z.string().min(1),
  requirements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  salaryRange: z.string().max(100).optional(),
  applyUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  paymentCurrency: PaymentCurrencyEnum.optional(),
  remotePolicy: RemotePolicyEnum.optional(),
  minEnglishLevel: EnglishLevelEnum.optional(),
});
// ============================================================================
// Update job (all optional + nullable for the enums users can clear)
// ============================================================================
export const UpdateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  jobType: JobTypeEnum.optional(),
  description: z.string().min(1).optional(),
  requirements: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  salaryRange: z.string().max(100).optional(),
  applyUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  paymentCurrency: PaymentCurrencyEnum.nullable().optional(),
  remotePolicy: RemotePolicyEnum.nullable().optional(),
  minEnglishLevel: EnglishLevelEnum.nullable().optional(),
});
// ============================================================================
// Quick apply
// ============================================================================
export const ApplyToJobSchema = z.object({
  coverLetter: z.string().optional(),
  resumeId: z.string().optional(),
});
// ============================================================================
// Import-from-URL (LLM preview)
// ============================================================================
export const ImportJobFromUrlSchema = z.object({ url: z.string().url().max(2000) });
// ============================================================================
// Response: a single job (matches what the service returns)
// ============================================================================
const JobResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable().optional(),
  jobType: JobTypeEnum,
  description: z.string(),
  requirements: z.array(z.string()),
  skills: z.array(z.string()),
  salaryRange: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional(),
  isActive: z.boolean(),
  authorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  paymentCurrency: PaymentCurrencyEnum.nullable().optional(),
  remotePolicy: RemotePolicyEnum.nullable().optional(),
  minEnglishLevel: EnglishLevelEnum.nullable().optional(),
});
// ============================================================================
// Response: paginated list of jobs (used by GET /v1/jobs/mine)
// ============================================================================
const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

const PaginatedJobsSchema = z.object({
  items: z.array(JobResponseSchema),
  pagination: PaginationMetaSchema,
});
// ============================================================================
// Response: applications received for a job
// ============================================================================
const JobApplicationCandidateSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string(),
  photoURL: z.string().nullable(),
});

const JobApplicationStatusEnum = z.enum([
  'SUBMITTED',
  'VIEWED',
  'REJECTED',
  'ACCEPTED',
  'WITHDRAWN',
]);

const JobApplicationItemSchema = z.object({
  id: z.string(),
  status: JobApplicationStatusEnum,
  createdAt: z.string(),
  coverLetter: z.string().nullable(),
  resumeId: z.string().nullable(),
  tailoredVersionId: z.string().nullable(),
  user: JobApplicationCandidateSchema.nullable(),
});

const JobApplicationsByJobSchema = z.object({
  items: z.array(JobApplicationItemSchema),
  pagination: PaginationMetaSchema,
});

export type CreateJobDto = z.infer<typeof CreateJobSchema>;

export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;

export type ApplyToJobDto = z.infer<typeof ApplyToJobSchema>;

export type ImportJobFromUrlDto = z.infer<typeof ImportJobFromUrlSchema>;

export type JobResponseDto = z.infer<typeof JobResponseSchema>;

export type PaginationMetaDto = z.infer<typeof PaginationMetaSchema>;

export type PaginatedJobsDto = z.infer<typeof PaginatedJobsSchema>;

export type JobApplicationCandidateDto = z.infer<typeof JobApplicationCandidateSchema>;

export type JobApplicationItemDto = z.infer<typeof JobApplicationItemSchema>;

export type JobApplicationsByJobDto = z.infer<typeof JobApplicationsByJobSchema>;
