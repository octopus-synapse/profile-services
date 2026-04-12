import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { PeriodEnum } from './analytics-enums.dto';

export const ViewStatsQuerySchema = z.object({
  period: PeriodEnum,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export class ViewStatsQueryDto extends createZodDto(ViewStatsQuerySchema) {}
