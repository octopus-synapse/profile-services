import { z } from 'zod';
import { LayoutConfigSchema } from './layout.schema';
import { SectionConfigSchema, SectionItemOverridesSchema } from './sections.schema';
import { DesignTokensSchema } from './tokens.schema';

export const ResumeDslSchema = z.object({
  version: z.string(),
  layout: LayoutConfigSchema,
  tokens: DesignTokensSchema,
  sections: z.array(SectionConfigSchema),
  itemOverrides: SectionItemOverridesSchema.optional(),
});

export type ResumeDsl = z.infer<typeof ResumeDslSchema>;
