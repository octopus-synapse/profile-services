import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Per-dimension coverage the UI uses to render segmented progress bars in the
 * Fit Score breakdown. All fields 0–100. Start with the two we can derive
 * cheaply from structured fields; additional dimensions (experience,
 * languages, location) come in when an LLM-backed matcher lands.
 */
export const JobMatchDimensionsSchema = z
  .object({
    hardSkills: z.number().min(0).max(100),
    softSkills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    languages: z.number().min(0).max(100),
    location: z.number().min(0).max(100),
  })
  .partial();

export const JobMatchResponseSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  recommendations: z.array(z.string()),
  dimensions: JobMatchDimensionsSchema.optional(),
});

export class JobMatchResponseDto extends createZodDto(JobMatchResponseSchema) {}
