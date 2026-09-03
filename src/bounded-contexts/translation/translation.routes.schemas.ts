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

// ─── Bilingual write-through (ADR-003) ─────────────────────────────────

export const ResumeTranslationParams = z.object({
  resumeId: z.string().uuid().openapi({ example: '01900000-0000-7000-a000-000000000010' }),
  locale: z.string().openapi({ example: 'en', description: 'Target locale: `en` or `pt-BR`.' }),
});

export const ResumeIdParams = z.object({
  resumeId: z.string().uuid().openapi({ example: '01900000-0000-7000-a000-000000000010' }),
});

export const TranslationReportSchema = z
  .object({
    resumeId: z.string().openapi({ example: '01900000-0000-7000-a000-000000000010' }),
    locale: z.string().openapi({ example: 'en' }),
    status: z.enum(['running', 'completed', 'failed', 'skipped']).openapi({ example: 'completed' }),
    reason: z
      .enum(['flag-off', 'monthly-cap', 'provider-unavailable', 'error'])
      .optional()
      .openapi({ example: 'monthly-cap' }),
    sectionsTranslated: z.number().int().openapi({ example: 4 }),
    itemsTranslated: z.number().int().openapi({ example: 9 }),
    itemsSkipped: z.number().int().openapi({ example: 3 }),
    tokensUsed: z.number().int().openapi({ example: 1240 }),
  })
  .openapi('TranslationReport', {
    example: {
      resumeId: '01900000-0000-7000-a000-000000000010',
      locale: 'en',
      status: 'completed',
      sectionsTranslated: 4,
      itemsTranslated: 9,
      itemsSkipped: 3,
      tokensUsed: 1240,
    },
  });

const count = (example: number) => z.number().int().openapi({ example });

const LocaleTranslationStatusSchema = z.object({
  locale: z.string().openapi({ example: 'en' }),
  /** `canonical` for the résumé's own language. */
  role: z.enum(['canonical', 'derived']).openapi({ example: 'derived' }),
  items: z.object({
    total: count(12),
    current: count(9),
    stale: count(1),
    missing: count(0),
    manual: count(1),
    diverged: count(1),
  }),
  prose: z
    .enum(['current', 'stale', 'missing', 'manual', 'diverged', 'n/a'])
    .openapi({ example: 'current' }),
});

export const ResumeTranslationStatusSchema = z
  .object({
    resumeId: z.string().openapi({ example: '01900000-0000-7000-a000-000000000010' }),
    language: z.string().openapi({ example: 'pt-BR' }),
    locales: z.array(LocaleTranslationStatusSchema),
  })
  .openapi('ResumeTranslationStatus');
