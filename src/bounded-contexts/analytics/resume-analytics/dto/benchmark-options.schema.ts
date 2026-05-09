import { z } from 'zod';

import { ExperienceLevelEnum, IndustryEnum } from './analytics-enums.schema';

export const BenchmarkOptionsSchema = z.object({
  industry: IndustryEnum,
  experienceLevel: ExperienceLevelEnum.optional(),
});

export type BenchmarkOptionsDto = z.infer<typeof BenchmarkOptionsSchema>;
