import { z } from 'zod';

const Get2faStatusResponseSchema = z.object({
  enabled: z.boolean(),
  lastUsedAt: z.string().datetime().nullable(),
  backupCodesRemaining: z.number().int(),
});

export type Get2faStatusResponseDto = z.infer<typeof Get2faStatusResponseSchema>;
