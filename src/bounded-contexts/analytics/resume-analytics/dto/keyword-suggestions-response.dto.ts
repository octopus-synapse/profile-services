import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const KeywordSuggestionsResponseSchema = z.object({
  existingKeywords: z.array(
    z.object({
      keyword: z.string(),
      count: z.number().int().nonnegative(),
      relevance: z.number().min(0).max(1),
    }),
  ),
  missingKeywords: z.array(z.string()),
  keywordDensity: z.number().min(0).max(1),
  warnings: z.array(
    z.object({
      type: z.string(),
      message: z.string(),
      affectedKeywords: z.array(z.string()),
    }),
  ),
  recommendations: z.array(z.string()),
});

export class KeywordSuggestionsResponseDto extends createZodDto(KeywordSuggestionsResponseSchema) {}
