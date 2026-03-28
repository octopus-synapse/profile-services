/**
 * Spoken Languages Controller Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
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

const SpokenLanguageListDataSchema = z.object({
  languages: z.array(SpokenLanguageSchema),
});

const SpokenLanguageDataSchema = z.object({
  language: SpokenLanguageSchema,
});

// ============================================================================
// DTOs
// ============================================================================

export class SpokenLanguageDto extends createZodDto(SpokenLanguageSchema) {}
export class SpokenLanguagesListDataDto extends createZodDto(SpokenLanguageListDataSchema) {}
export class SpokenLanguageDataDto extends createZodDto(SpokenLanguageDataSchema) {}
