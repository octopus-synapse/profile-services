import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ViewStatsResponseSchema = z.object({
  totalViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  viewsByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
  ),
});

export class ViewStatsResponseDto extends createZodDto(ViewStatsResponseSchema) {}
