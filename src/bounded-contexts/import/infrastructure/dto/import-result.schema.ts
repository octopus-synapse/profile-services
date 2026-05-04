import { ImportStatus } from '@prisma/client';
import { z } from 'zod';

export const ImportStatusEnumSchema = z.nativeEnum(ImportStatus);

export const ImportResultSchema = z.object({
  importId: z.string(),
  status: ImportStatusEnumSchema,
  resumeId: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

export type ImportStatusEnumDto = z.infer<typeof ImportStatusEnumSchema>;

export type ImportResultDto = z.infer<typeof ImportResultSchema>;
