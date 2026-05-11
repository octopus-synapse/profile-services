import {
  EnglishLevel,
  JobApplicationStatus,
  JobType,
  PaymentCurrency,
  RemotePolicy,
} from '@prisma/client';
import { z } from 'zod';
import { SocialUrlSchema } from '@/shared-kernel/schemas/primitives';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// Use the Prisma enum values as the source of truth so the DTO type matches
// what the JobService methods expect (avoids structural mismatch on string vs
// enum literal — Prisma generates string-literal enums but `nominal` typed).
const JobTypeEnum = z.nativeEnum(JobType);
const RemotePolicyEnum = z.nativeEnum(RemotePolicy);
const PaymentCurrencyEnum = z.nativeEnum(PaymentCurrency);
const EnglishLevelEnum = z.nativeEnum(EnglishLevel);
const JobApplicationStatusEnum = z.nativeEnum(JobApplicationStatus);

// ============================================================================
// Create job
// ============================================================================
export const CreateJobSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(200)
      .openapi({ description: 'Job posting title (max 200 chars).' }),
    company: z
      .string()
      .min(1)
      .max(200)
      .openapi({ description: 'Hiring company name (max 200 chars).' }),
    location: z
      .string()
      .max(200)
      .optional()
      .openapi({ description: 'Location label (e.g. "Remote", "São Paulo, BR"). Optional.' }),
    jobType: JobTypeEnum.openapi({
      description: 'Employment type (full-time, part-time, contract, etc).',
    }),
    description: z
      .string()
      .min(1)
      .openapi({ description: 'Long-form job description. Plaintext or markdown.' }),
    requirements: z.array(z.string().max(200)).max(40).optional().openapi({
      description: 'List of required qualifications (max 40 entries, 200 chars each).',
    }),
    skills: z
      .array(z.string().max(60))
      .max(40)
      .optional()
      .openapi({ description: 'List of relevant skills (max 40 entries, 60 chars each).' }),
    salaryRange: z
      .string()
      .max(100)
      .optional()
      .openapi({ description: 'Free-form salary range label (e.g. "USD 80k-120k"). Optional.' }),
    applyUrl: SocialUrlSchema.optional(),
    expiresAt: IsoDateTimeSchema.optional(),
    paymentCurrency: PaymentCurrencyEnum.optional().openapi({
      description: 'ISO 4217 currency code for the salary range. Optional.',
    }),
    remotePolicy: RemotePolicyEnum.optional().openapi({
      description: 'Remote / hybrid / on-site policy. Optional.',
    }),
    minEnglishLevel: EnglishLevelEnum.optional().openapi({
      description: 'Minimum English proficiency level expected from candidates. Optional.',
    }),
  })
  .openapi('CreateJobRequest', {
    description:
      'Create-job payload. `applyUrl` is the public link recruiters share with candidates.',
    example: {
      title: 'Senior Backend Engineer',
      company: 'Acme Corp',
      location: 'Remote',
      jobType: 'FULL_TIME',
      description: 'We are looking for a senior backend engineer to join our team.',
      skills: ['typescript', 'nodejs', 'postgresql'],
      remotePolicy: 'REMOTE',
      paymentCurrency: 'USD',
    },
  });
// ============================================================================
// Update job (all optional + nullable for the enums users can clear)
// ============================================================================
export const UpdateJobSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .openapi({ description: 'Updated job title (max 200 chars).' }),
    company: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .openapi({ description: 'Updated hiring company name (max 200 chars).' }),
    location: z
      .string()
      .max(200)
      .optional()
      .openapi({ description: 'Updated location label. Optional.' }),
    jobType: JobTypeEnum.optional().openapi({ description: 'Updated employment type.' }),
    description: z
      .string()
      .min(1)
      .optional()
      .openapi({ description: 'Updated long-form job description.' }),
    requirements: z
      .array(z.string().max(200))
      .max(40)
      .optional()
      .openapi({ description: 'Updated list of required qualifications.' }),
    skills: z
      .array(z.string().max(60))
      .max(40)
      .optional()
      .openapi({ description: 'Updated list of relevant skills.' }),
    salaryRange: z
      .string()
      .max(100)
      .optional()
      .openapi({ description: 'Updated free-form salary range label.' }),
    applyUrl: SocialUrlSchema.optional(),
    isActive: z
      .boolean()
      .optional()
      .openapi({ description: 'Whether the job is currently active and visible.' }),
    expiresAt: IsoDateTimeSchema.optional(),
    paymentCurrency: PaymentCurrencyEnum.nullable().optional().openapi({
      description: 'Updated ISO 4217 currency code. Null clears the previous value.',
    }),
    remotePolicy: RemotePolicyEnum.nullable().optional().openapi({
      description: 'Updated remote / hybrid / on-site policy. Null clears the previous value.',
    }),
    minEnglishLevel: EnglishLevelEnum.nullable().optional().openapi({
      description: 'Updated minimum English level. Null clears the previous value.',
    }),
  })
  .openapi('UpdateJobRequest', {
    description: 'Partial update of a job. Nullable enums let users clear an existing selection.',
    example: {
      title: 'Senior Backend Engineer (Updated)',
      isActive: true,
    },
  });
// ============================================================================
// Quick apply
// ============================================================================
export const ApplyToJobSchema = z
  .object({
    coverLetter: z
      .string()
      .max(5000)
      .optional()
      .openapi({ description: 'Optional cover letter (max 5000 chars).' }),
    resumeId: z
      .string()
      .uuid()
      .optional()
      .openapi({ description: 'Resume id to apply with. Defaults to the primary resume.' }),
  })
  .openapi('ApplyToJobRequest', {
    description:
      'Submit a job application. `resumeId` references the resume the candidate wants to apply with; if omitted, the primary resume is used.',
    example: {
      coverLetter: 'I am excited about this role because of your engineering culture.',
      resumeId: '01900000-0000-7000-a000-000000000010',
    },
  });
// ============================================================================
// Import-from-URL (LLM preview)
// ============================================================================
export const ImportJobFromUrlSchema = z
  .object({
    url: z.string().url().max(2000).openapi({
      description: 'Public URL of an external job posting to import (max 2000 chars).',
    }),
  })
  .openapi({
    example: {
      url: 'https://careers.example.com/jobs/senior-backend-engineer',
    },
  });
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
