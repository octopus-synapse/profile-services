import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const JobMatchResponseSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export class JobMatchResponseDto extends createZodDto(JobMatchResponseSchema) {}
