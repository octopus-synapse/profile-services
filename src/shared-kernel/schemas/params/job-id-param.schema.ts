import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { EXAMPLE_JOB_ID } from './example-values.const';

extendZodWithOpenApi(z);

/** Route param: `/:jobId` */
export const JobIdParamSchema = z.object({
  jobId: z.string().uuid('jobId must be a valid UUID').openapi({ example: EXAMPLE_JOB_ID }),
});

export type JobIdParam = z.infer<typeof JobIdParamSchema>;
