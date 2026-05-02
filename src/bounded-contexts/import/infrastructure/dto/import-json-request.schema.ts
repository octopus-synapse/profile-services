import { z } from 'zod';

import { JsonResumeSchema } from './json-resume-schema.schema';

export const ImportJsonRequestSchema = z.object({ data: JsonResumeSchema });

export type ImportJsonRequestDto = z.infer<typeof ImportJsonRequestSchema>;
