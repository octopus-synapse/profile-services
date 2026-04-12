import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { PriorityEnum } from './analytics-enums.dto';

export const BenchmarkResponseSchema = z.object({
  percentile: z.number().min(0).max(100),
  totalInIndustry: z.number().int().nonnegative(),
  comparison: z.object({
    avgATSScore: z.number().min(0).max(100),
    yourATSScore: z.number().min(0).max(100),
    avgViews: z.number().nonnegative(),
    yourViews: z.number().nonnegative(),
    avgStructuredItemCount: z.number().int().nonnegative(),
    yourStructuredItemCount: z.number().int().nonnegative(),
    avgCareerDepthYears: z.number().nonnegative(),
    yourCareerDepthYears: z.number().nonnegative(),
  }),
  topPerformers: z.object({
    commonKeywords: z.array(z.string()),
    avgCareerDepthYears: z.number().nonnegative(),
    avgStructuredItemCount: z.number().int().nonnegative(),
    commonCredentials: z.array(z.string()),
  }),
  recommendations: z.array(
    z.object({
      type: z.string(),
      priority: PriorityEnum,
      message: z.string(),
      action: z.string(),
    }),
  ),
});

export class BenchmarkResponseDto extends createZodDto(BenchmarkResponseSchema) {}
