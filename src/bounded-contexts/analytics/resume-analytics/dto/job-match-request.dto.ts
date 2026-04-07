import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const JobMatchRequestSchema = z.object({
  jobDescription: z.string().min(10),
});

export class JobMatchRequestDto extends createZodDto(JobMatchRequestSchema) {}
