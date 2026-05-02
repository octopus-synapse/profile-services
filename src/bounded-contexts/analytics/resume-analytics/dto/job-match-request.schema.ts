import { z } from 'zod';

export const JobMatchRequestSchema = z.object({ jobDescription: z.string().min(10) });

export type JobMatchRequestDto = z.infer<typeof JobMatchRequestSchema>;
