/**
 * Translation DTOs
 */

import { z } from "zod";

export const TranslateTextSchema = z.object({
 text: z.string().min(1),
 sourceLanguage: z.string().min(2).max(10),
 targetLanguage: z.string().min(2).max(10),
});

export type TranslateText = z.infer<typeof TranslateTextSchema>;

export const TranslateBatchSchema = z.object({
 texts: z.array(z.string().min(1)),
 sourceLanguage: z.string().min(2).max(10),
 targetLanguage: z.string().min(2).max(10),
});

export type TranslateBatch = z.infer<typeof TranslateBatchSchema>;

// ============================================================================
// Translation Language Enum
// ============================================================================

export const TranslationLanguageEnum = z.enum(["en", "pt", "es", "fr", "de"]);
export type TranslationLanguage = z.infer<typeof TranslationLanguageEnum>;

// ============================================================================
// Enhanced Request Schemas with Language Enum
// ============================================================================

export const TranslateTextWithEnumSchema = z.object({
  text: z.string().min(1),
  sourceLanguage: TranslationLanguageEnum,
  targetLanguage: TranslationLanguageEnum,
});

export type TranslateTextWithEnum = z.infer<typeof TranslateTextWithEnumSchema>;

export const TranslateBatchWithEnumSchema = z.object({
  texts: z.array(z.string().min(1)),
  sourceLanguage: TranslationLanguageEnum,
  targetLanguage: TranslationLanguageEnum,
});

export type TranslateBatchWithEnum = z.infer<typeof TranslateBatchWithEnumSchema>;

// ============================================================================
// Response DTOs
// ============================================================================

export const TranslationResultSchema = z.object({
  translatedText: z.string(),
  sourceLanguage: TranslationLanguageEnum,
  targetLanguage: TranslationLanguageEnum,
  confidence: z.number().min(0).max(1).optional(),
});

export type TranslationResult = z.infer<typeof TranslationResultSchema>;

export const BatchTranslationResultSchema = z.object({
  translations: z.array(TranslationResultSchema),
  sourceLanguage: TranslationLanguageEnum,
  targetLanguage: TranslationLanguageEnum,
});

export type BatchTranslationResult = z.infer<typeof BatchTranslationResultSchema>;

export const ServiceHealthSchema = z.object({
  status: z.enum(["healthy", "unavailable"]),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;
