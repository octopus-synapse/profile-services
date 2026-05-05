import { z } from 'zod';

/** Route param: `/:resumeId` */
export const ResumeIdParamSchema = z.object({
  resumeId: z.string().uuid("resumeId must be a valid UUID"),
});

export type ResumeIdParam = z.infer<typeof ResumeIdParamSchema>;
