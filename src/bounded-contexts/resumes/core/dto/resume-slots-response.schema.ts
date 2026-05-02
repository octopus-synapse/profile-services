import { z } from 'zod';

export const ResumeSlotsResponseSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  remaining: z.number().int(),
});

export type ResumeSlotsResponseDto = z.infer<typeof ResumeSlotsResponseSchema>;
