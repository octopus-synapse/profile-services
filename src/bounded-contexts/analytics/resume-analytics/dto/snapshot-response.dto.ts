import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SnapshotResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  atsScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  topKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  createdAt: z.date(),
});

export class SnapshotResponseDto extends createZodDto(SnapshotResponseSchema) {}
