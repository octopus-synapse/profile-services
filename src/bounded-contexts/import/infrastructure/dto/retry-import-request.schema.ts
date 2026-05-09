import { z } from 'zod';

export const RetryImportRequestSchema = z.object({ force: z.boolean().default(false).optional() });

export type RetryImportRequestDto = z.infer<typeof RetryImportRequestSchema>;
