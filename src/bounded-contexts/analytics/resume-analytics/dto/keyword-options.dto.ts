import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { IndustryEnum } from './analytics-enums.dto';

export const KeywordOptionsSchema = z.object({
  industry: IndustryEnum,
  targetRole: z.string().optional(),
});

export class KeywordOptionsDto extends createZodDto(KeywordOptionsSchema) {}
