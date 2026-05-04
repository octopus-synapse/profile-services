import { z } from 'zod';

/** Route param: `/:resumeId` */
export const ResumeIdParamSchema = z.object({
  resumeId: z.string().min(1, 'resumeId is required'),
});

export type ResumeIdParam = z.infer<typeof ResumeIdParamSchema>;
