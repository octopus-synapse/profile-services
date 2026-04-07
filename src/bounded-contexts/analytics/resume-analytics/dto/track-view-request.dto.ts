import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TrackViewRequestSchema = z.object({
  resumeId: z.string().min(1),
  userAgent: z.string().optional(),
  referer: z.string().optional(),
});

export class TrackViewRequestDto extends createZodDto(TrackViewRequestSchema) {}
