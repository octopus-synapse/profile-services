import { z } from 'zod';

/** Route param: `/:jobId` */
export const JobIdParamSchema = z.object({
  jobId: z.string().uuid('jobId must be a valid UUID'),
});

export type JobIdParam = z.infer<typeof JobIdParamSchema>;
