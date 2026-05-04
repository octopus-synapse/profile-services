import { z } from 'zod';

/** Route param: `/:jobId` */
export const JobIdParamSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
});

export type JobIdParam = z.infer<typeof JobIdParamSchema>;
