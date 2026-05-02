import { z } from 'zod';

import { IndustryEnum } from './analytics-enums.schema';

export const KeywordOptionsSchema = z.object({
  industry: IndustryEnum,
  targetRole: z.string().optional(),
});

export type KeywordOptionsDto = z.infer<typeof KeywordOptionsSchema>;
