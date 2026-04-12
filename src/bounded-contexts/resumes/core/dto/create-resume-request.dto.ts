import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateResumeRequestSchema = z.object({
  title: z.string().min(1).max(100),
  summary: z.string().max(2000).optional(),
  template: z.string().optional(),
  isPublic: z.boolean().optional(),
  fullName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  emailContact: z.string().email().optional(),
  location: z.string().max(100).optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  website: z.string().url().optional(),
  sections: z.array(z.record(z.unknown())).optional(),
});

export class CreateResumeRequestDto extends createZodDto(CreateResumeRequestSchema) {}
