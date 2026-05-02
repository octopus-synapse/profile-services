import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const SpokenLanguageSchema = z.object({
  code: z.string(),
  nameEn: z.string(),
  namePtBr: z.string(),
  nameEs: z.string(),
  nativeName: z.string().nullable(),
});

const SpokenLanguageListDataSchema = z.object({ languages: z.array(SpokenLanguageSchema) });

const SpokenLanguageDataSchema = z.object({ language: SpokenLanguageSchema });

// ============================================================================
// DTOs
// ============================================================================

export type SpokenLanguageDto = z.infer<typeof SpokenLanguageSchema>;

export type SpokenLanguageListDataDto = z.infer<typeof SpokenLanguageListDataSchema>;

export type SpokenLanguageDataDto = z.infer<typeof SpokenLanguageDataSchema>;
