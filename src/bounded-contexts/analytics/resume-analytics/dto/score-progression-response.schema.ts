import { z } from 'zod';

import { TrendEnum } from './analytics-enums.schema';

export const ScoreProgressionResponseSchema = z.object({
  snapshots: z.array(z.object({ date: z.date(), score: z.number().min(0).max(100) })),
  trend: TrendEnum,
  changePercent: z.number(),
});

export type ScoreProgressionResponseDto = z.infer<typeof ScoreProgressionResponseSchema>;
