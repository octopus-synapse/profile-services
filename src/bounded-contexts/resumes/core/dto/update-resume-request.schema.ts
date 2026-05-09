import { z } from 'zod';
import { CreateResumeRequestSchema } from './create-resume-request.schema';

export const UpdateResumeRequestSchema = CreateResumeRequestSchema.partial();

export type UpdateResumeRequestDto = z.infer<typeof UpdateResumeRequestSchema>;
