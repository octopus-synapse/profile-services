import { z } from 'zod';

export const TrackViewRequestSchema = z.object({
  userAgent: z.string().optional(),
  referer: z.string().optional(),
});

export type TrackViewRequestDto = z.infer<typeof TrackViewRequestSchema>;
