/**
 * Route descriptors for the translation BC. Replaces
 * `TranslationController`. The BC's HTTP boundary fronts a single
 * `TranslationService` aggregate, which we use directly as the bundle
 * token (no separate Use-Cases port today).
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const TranslateTextSchema = z
  .object({
    text: z.string().min(1),
    sourceLanguage: z.enum(['pt', 'en', 'auto']).default('auto'),
    targetLanguage: z.enum(['pt', 'en']),
  })
  .openapi({
    example: {
      text: 'Senior Backend Engineer with 8 years of experience.',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
    },
  });

export const TranslateSimpleSchema = z.object({ text: z.string().min(1) }).openapi({
  example: {
    text: 'Engenheiro de software com experiência em sistemas distribuídos.',
  },
});

export const TranslateBatchSchema = z
  .object({
    texts: z.array(z.string().min(1)).min(1),
    sourceLanguage: z.enum(['pt', 'en', 'auto']).default('auto'),
    targetLanguage: z.enum(['pt', 'en']),
  })
  .openapi({
    example: {
      texts: ['Built scalable microservices on AWS.', 'Led a team of five backend engineers.'],
      sourceLanguage: 'en',
      targetLanguage: 'pt',
    },
  });

// ─── Response schemas ────────────────────────────────────────────────
export const TranslationLanguageSchema = z.enum(['pt', 'en']);
export const SourceLanguageSchema = z.enum(['pt', 'en', 'auto']);

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unavailable']),
  timestamp: IsoDateTimeSchema,
});

export const TranslationResultSchema = z.object({
  original: z.string(),
  translated: z.string(),
  sourceLanguage: SourceLanguageSchema,
  targetLanguage: TranslationLanguageSchema,
  detectedLanguage: TranslationLanguageSchema.optional(),
});

export const LanguageDetectionsResponseSchema = z.object({
  detections: z.array(
    z.object({
      language: z.string(),
      confidence: z.number(),
    }),
  ),
});

export const BatchTranslationResponseSchema = z.object({
  translations: z.array(TranslationResultSchema),
  failed: z.array(
    z.object({
      text: z.string(),
      error: z.string(),
    }),
  ),
});
