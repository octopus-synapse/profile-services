import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_RESUME_ID } from './example-values.const';

extendZodWithOpenApi(z);

/** Route param: `/:resumeId` */
export const ResumeIdParamSchema = z.object({
  resumeId: z
    .string()
    .uuid('resumeId must be a valid UUID')
    .openapi({ example: EXAMPLE_RESUME_ID }),
});

export type ResumeIdParam = z.infer<typeof ResumeIdParamSchema>;
