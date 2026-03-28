/**
 * Translation DTOs
 * Request and response DTOs for translation operations
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Schema for translating a single text with explicit source and target languages
 */
const TranslateTextSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
});

export class TranslateTextDto extends createZodDto(TranslateTextSchema) {}

/**
 * Schema for translating multiple texts in batch
 */
const TranslateBatchSchema = z.object({
  texts: z.array(z.string().min(1)).min(1, 'At least one text is required'),
  sourceLanguage: z.string().min(2).max(10),
  targetLanguage: z.string().min(2).max(10),
});

export class TranslateBatchDto extends createZodDto(TranslateBatchSchema) {}

/**
 * Schema for simple text translation (used by pt-to-en and en-to-pt endpoints)
 */
const TranslateSimpleSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

export class TranslateSimpleDto extends createZodDto(TranslateSimpleSchema) {}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Schema for health check response
 */
const HealthCheckResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string().datetime(),
});

export class HealthCheckResponseDto extends createZodDto(HealthCheckResponseSchema) {}

/**
 * Schema for translation result
 * Matches the TranslationResult type from translation.types.ts
 */
const TranslationResultSchema = z.object({
  original: z.string(),
  translated: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
});

export class TranslationResultDto extends createZodDto(TranslationResultSchema) {}

/**
 * Schema for failed translation item
 */
const FailedTranslationSchema = z.object({
  text: z.string(),
  error: z.string(),
});

export class FailedTranslationDto extends createZodDto(FailedTranslationSchema) {}

/**
 * Schema for batch translation result
 * Matches the BatchTranslationResult type from translation.types.ts
 */
const BatchTranslationResultSchema = z.object({
  translations: z.array(TranslationResultSchema),
  failed: z.array(FailedTranslationSchema),
});

export class BatchTranslationResultDto extends createZodDto(BatchTranslationResultSchema) {}
