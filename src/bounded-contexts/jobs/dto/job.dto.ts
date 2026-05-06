import { EnglishLevel, JobType, PaymentCurrency, RemotePolicy } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

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
  expiresAt: IsoDateTimeSchema.optional(),
  paymentCurrency: PaymentCurrencyEnum.optional(),
  remotePolicy: RemotePolicyEnum.optional(),
  minEnglishLevel: EnglishLevelEnum.optional(),
});

export class CreateJobDto extends createZodDto(CreateJobSchema) {}

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
  expiresAt: IsoDateTimeSchema.optional(),
  paymentCurrency: PaymentCurrencyEnum.nullable().optional(),
  remotePolicy: RemotePolicyEnum.nullable().optional(),
  minEnglishLevel: EnglishLevelEnum.nullable().optional(),
});

export class UpdateJobDto extends createZodDto(UpdateJobSchema) {}

// ============================================================================
// Quick apply
// ============================================================================
export const ApplyToJobSchema = z.object({
  coverLetter: z.string().optional(),
  resumeId: z.string().optional(),
});

export class ApplyToJobDto extends createZodDto(ApplyToJobSchema) {}

// ============================================================================
// Import-from-URL (LLM preview)
// ============================================================================
export const ImportJobFromUrlSchema = z.object({ url: z.string().url().max(2000) });

export class ImportJobFromUrlDto extends createZodDto(ImportJobFromUrlSchema) {}

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

export class JobResponseDto extends createZodDto(JobResponseSchema) {}

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

export class PaginatedJobsDto extends createZodDto(PaginatedJobsSchema) {}

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

export class JobApplicationsByJobDto extends createZodDto(JobApplicationsByJobSchema) {}
