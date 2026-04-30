import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Body for `POST /v1/resumes/:resumeId/tailor`.
 *
 * At least one of `jobId` OR `jobDescription` is required; the service
 * enforces this at runtime and returns 409 TAILOR_INPUT_REQUIRED otherwise.
 * We keep both optional in the schema so callers can omit the other half.
 */
export const TailorResumeRequestSchema = z.object({
  jobId: z.string().min(1).optional(),
  jobDescription: z.string().min(10).optional(),
  jobTitle: z.string().max(200).optional(),
  jobCompany: z.string().max(200).optional(),
});

export class TailorResumeRequestDto extends createZodDto(TailorResumeRequestSchema) {}
