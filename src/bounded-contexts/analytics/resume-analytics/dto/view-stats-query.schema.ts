import { z } from 'zod';

import { PeriodEnum } from './analytics-enums.schema';

export const ViewStatsQuerySchema = z.object({
  period: PeriodEnum,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ViewStatsQueryDto = z.infer<typeof ViewStatsQuerySchema>;
