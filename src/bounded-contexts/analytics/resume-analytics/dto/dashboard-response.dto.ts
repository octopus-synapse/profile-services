import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { PriorityEnum, TrendEnum } from './analytics-enums.dto';

export const DashboardResponseSchema = z.object({
  resumeId: z.string(),
  overview: z.object({
    totalViews: z.number().int().nonnegative(),
    uniqueVisitors: z.number().int().nonnegative(),
    atsScore: z.number().min(0).max(100),
    keywordScore: z.number().min(0).max(100),
    industryPercentile: z.number().min(0).max(100),
  }),
  viewTrend: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  topSources: z.array(
    z.object({
      source: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  keywordHealth: z.object({
    score: z.number().min(0).max(100),
    topKeywords: z.array(z.string()),
    missingCritical: z.array(z.string()),
  }),
  industryPosition: z.object({
    percentile: z.number().min(0).max(100),
    trend: TrendEnum,
  }),
  recommendations: z.array(
    z.object({
      type: z.string(),
      priority: PriorityEnum,
      message: z.string(),
    }),
  ),
});

export class DashboardResponseDto extends createZodDto(DashboardResponseSchema) {}
