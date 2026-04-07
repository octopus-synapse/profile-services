import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResumeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string().optional(),
  targetRole: z.string().optional(),
  isPublic: z.boolean(),
  slug: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export class ResumeResponseDto extends createZodDto(ResumeResponseSchema) {}
