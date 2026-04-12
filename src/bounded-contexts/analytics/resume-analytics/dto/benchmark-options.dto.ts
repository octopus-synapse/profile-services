import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ExperienceLevelEnum, IndustryEnum } from './analytics-enums.dto';

export const BenchmarkOptionsSchema = z.object({
  industry: IndustryEnum,
  experienceLevel: ExperienceLevelEnum.optional(),
});

export class BenchmarkOptionsDto extends createZodDto(BenchmarkOptionsSchema) {}
