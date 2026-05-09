import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

const Get2faStatusResponseSchema = z.object({
  enabled: z.boolean(),
  lastUsedAt: IsoDateTimeSchema.nullable(),
  backupCodesRemaining: z.number().int(),
});

export type Get2faStatusResponseDto = z.infer<typeof Get2faStatusResponseSchema>;
