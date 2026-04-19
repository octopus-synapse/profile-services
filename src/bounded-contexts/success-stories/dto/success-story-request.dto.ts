import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateSuccessStorySchema = z.object({
  userId: z.string().min(1),
  headline: z.string().min(1).max(200),
  beforeText: z.string().min(1).max(500),
  afterText: z.string().min(1).max(500),
  quote: z.string().min(1).max(500),
  timeframeDays: z.number().int().min(0).max(3650).optional(),
  weight: z.number().int().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export class CreateSuccessStoryDto extends createZodDto(CreateSuccessStorySchema) {}

export const UpdateSuccessStorySchema = CreateSuccessStorySchema.partial().omit({ userId: true });

export class UpdateSuccessStoryDto extends createZodDto(UpdateSuccessStorySchema) {}
